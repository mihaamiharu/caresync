import { and, eq, inArray } from "drizzle-orm";
import type { db } from "../db";
import { doctorSchedules, appointments } from "../db/schema";

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * Computes available appointment slots for a doctor on a given date.
 *
 * Schedule times are stored as UTC+7 (Bangkok). Returned slots are ISO UTC
 * datetime strings. Slots in the past and slots overlapping confirmed/pending
 * appointments are excluded.
 */
export async function computeAvailableSlots(
  doctorId: string,
  date: string, // YYYY-MM-DD
  dbClient: typeof db
): Promise<string[]> {
  // 1. Derive day of week from the date (use noon UTC to avoid DST edge cases)
  const dayIndex = new Date(`${date}T12:00:00Z`).getUTCDay();
  const dayName = DAY_NAMES[dayIndex];

  // 2. Fetch schedule row for that day
  const [scheduleRow] = await dbClient
    .select()
    .from(doctorSchedules)
    .where(
      and(
        eq(doctorSchedules.doctorId, doctorId),
        eq(doctorSchedules.dayOfWeek, dayName)
      )
    )
    .limit(1);

  if (!scheduleRow) return [];

  // 3. Generate all slots (schedule times are UTC+7)
  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m; // minutes since midnight
  };

  const startMin = parseTime(scheduleRow.startTime);
  const endMin = parseTime(scheduleRow.endTime);
  const slots: string[] = [];

  for (
    let min = startMin;
    min < endMin;
    min += scheduleRow.slotDurationMinutes
  ) {
    const hh = String(Math.floor(min / 60)).padStart(2, "0");
    const mm = String(min % 60).padStart(2, "0");
    // Build ISO UTC by treating schedule time as UTC+7
    const slotIso = new Date(`${date}T${hh}:${mm}:00+07:00`).toISOString();
    slots.push(slotIso);
  }

  // 4. Filter out past slots
  const now = new Date();
  const futureSlots = slots.filter((iso) => new Date(iso) > now);

  if (futureSlots.length === 0) return [];

  // 5. Fetch booked appointments on that date (excludes cancelled/no-show)
  const bookedAppts = await dbClient
    .select({
      startTime: appointments.startTime,
      endTime: appointments.endTime,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.appointmentDate, date),
        inArray(appointments.status, [
          "pending",
          "confirmed",
          "in-progress",
          "completed",
        ])
      )
    );

  if (bookedAppts.length === 0) return futureSlots;

  // 6. Remove slots that overlap with any booked appointment
  // Slot ISO "2026-05-04T02:00:00.000Z" → UTC time "02:00"
  // Appointment times are stored in UTC
  return futureSlots.filter((slotIso) => {
    const slotUtcTime = slotIso.substring(11, 16); // "HH:MM"
    return !bookedAppts.some((appt) => {
      const apptStart = appt.startTime.substring(0, 5); // "HH:MM"
      const apptEnd = appt.endTime.substring(0, 5); // "HH:MM"
      return slotUtcTime >= apptStart && slotUtcTime < apptEnd;
    });
  });
}
