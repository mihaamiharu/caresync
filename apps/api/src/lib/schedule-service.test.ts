import { describe, it, expect, vi } from "vitest";
import { computeAvailableSlots } from "./schedule-service";

// ─── Mock DB factory ──────────────────────────────────────────────────────────
//
// The service makes exactly two select calls:
//   1. fetch schedule row:      .select().from().where().limit(1)
//   2. fetch booked appts:      .select().from().where()          (no limit)
//
// If no schedule row is found or all slots are in the past, call #2 is skipped.

function makeMockDb(scheduleRows: unknown[], appointmentRows: unknown[]) {
  const scheduleChain = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(scheduleRows),
      }),
    }),
  };

  const appointmentsChain = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(appointmentRows),
    }),
  };

  const select = vi
    .fn()
    .mockReturnValueOnce(scheduleChain)
    .mockReturnValueOnce(appointmentsChain);

  return { select } as any;
}

// Future Monday far enough that all slots are ahead of now
const FUTURE_MONDAY = "2026-05-04";

const mockScheduleRow = {
  id: "sched-001",
  doctorId: "doc-001",
  dayOfWeek: "monday",
  startTime: "09:00",
  endTime: "10:00",
  slotDurationMinutes: 30,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("computeAvailableSlots", () => {
  it("returns [] when doctor has no schedule for that day", async () => {
    const mockDb = makeMockDb([], []);
    const result = await computeAvailableSlots(
      "doc-001",
      FUTURE_MONDAY,
      mockDb
    );
    expect(result).toEqual([]);
  });

  it("returns [] for a fully past date", async () => {
    // 2020-01-06 is a Monday in the past
    const mockDb = makeMockDb(
      [{ ...mockScheduleRow, dayOfWeek: "monday" }],
      []
    );
    const result = await computeAvailableSlots("doc-001", "2020-01-06", mockDb);
    expect(result).toEqual([]);
  });

  it("generates correct slots as ISO UTC strings for a future date", async () => {
    const mockDb = makeMockDb([mockScheduleRow], []);
    const result = await computeAvailableSlots(
      "doc-001",
      FUTURE_MONDAY,
      mockDb
    );

    // schedule 09:00–10:00 UTC+7 → 30min slots
    // 09:00 UTC+7 = 02:00 UTC, 09:30 UTC+7 = 02:30 UTC
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("2026-05-04T02:00:00.000Z");
    expect(result[1]).toBe("2026-05-04T02:30:00.000Z");
  });

  it("excludes a slot overlapping a booked appointment", async () => {
    // appointment 02:00–02:30 UTC (= 09:00–09:30 UTC+7)
    const mockDb = makeMockDb(
      [mockScheduleRow],
      [{ startTime: "02:00:00", endTime: "02:30:00" }]
    );
    const result = await computeAvailableSlots(
      "doc-001",
      FUTURE_MONDAY,
      mockDb
    );

    // slot 09:00 (02:00 UTC) blocked; slot 09:30 (02:30 UTC) is NOT blocked
    // because check is slotUtc >= apptStart && slotUtc < apptEnd
    // 02:30 < 02:30 is false → not blocked
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("2026-05-04T02:30:00.000Z");
  });

  it("blocks two slots for a 45-minute appointment (multi-overlap)", async () => {
    const extendedSchedule = { ...mockScheduleRow, endTime: "11:00" }; // 4 slots
    // appointment 02:00–02:45 UTC (= 09:00–09:45 UTC+7)
    const mockDb = makeMockDb(
      [extendedSchedule],
      [{ startTime: "02:00:00", endTime: "02:45:00" }]
    );
    const result = await computeAvailableSlots(
      "doc-001",
      FUTURE_MONDAY,
      mockDb
    );

    // 09:00 (02:00 UTC) → blocked
    // 09:30 (02:30 UTC) → blocked (02:30 < 02:45)
    // 10:00 (03:00 UTC) → free
    // 10:30 (03:30 UTC) → free
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("2026-05-04T03:00:00.000Z");
    expect(result[1]).toBe("2026-05-04T03:30:00.000Z");
  });
});
