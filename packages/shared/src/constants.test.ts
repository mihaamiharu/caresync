import { describe, it, expect } from "vitest";
import {
  USER_ROLES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  INVOICE_STATUSES,
  GENDERS,
  BLOOD_TYPES,
  DAYS_OF_WEEK,
} from "./constants";

describe("USER_ROLES", () => {
  it("contains admin, doctor, and patient", () => {
    expect(USER_ROLES).toContain("admin");
    expect(USER_ROLES).toContain("doctor");
    expect(USER_ROLES).toContain("patient");
  });

  it("has exactly 3 roles", () => {
    expect(USER_ROLES).toHaveLength(3);
  });
});

describe("APPOINTMENT_STATUSES", () => {
  it("contains all expected statuses", () => {
    expect(APPOINTMENT_STATUSES).toContain("pending");
    expect(APPOINTMENT_STATUSES).toContain("confirmed");
    expect(APPOINTMENT_STATUSES).toContain("in-progress");
    expect(APPOINTMENT_STATUSES).toContain("completed");
    expect(APPOINTMENT_STATUSES).toContain("cancelled");
    expect(APPOINTMENT_STATUSES).toContain("no-show");
  });
});

describe("APPOINTMENT_TYPES", () => {
  it("contains consultation, follow-up, and emergency", () => {
    expect(APPOINTMENT_TYPES).toContain("consultation");
    expect(APPOINTMENT_TYPES).toContain("follow-up");
    expect(APPOINTMENT_TYPES).toContain("emergency");
  });
});

describe("INVOICE_STATUSES", () => {
  it("contains pending, paid, overdue, and cancelled", () => {
    expect(INVOICE_STATUSES).toContain("pending");
    expect(INVOICE_STATUSES).toContain("paid");
    expect(INVOICE_STATUSES).toContain("overdue");
    expect(INVOICE_STATUSES).toContain("cancelled");
  });
});

describe("GENDERS", () => {
  it("contains male, female, and other", () => {
    expect(GENDERS).toContain("male");
    expect(GENDERS).toContain("female");
    expect(GENDERS).toContain("other");
  });
});

describe("BLOOD_TYPES", () => {
  it("contains all 8 blood types", () => {
    expect(BLOOD_TYPES).toContain("A+");
    expect(BLOOD_TYPES).toContain("A-");
    expect(BLOOD_TYPES).toContain("B+");
    expect(BLOOD_TYPES).toContain("B-");
    expect(BLOOD_TYPES).toContain("AB+");
    expect(BLOOD_TYPES).toContain("AB-");
    expect(BLOOD_TYPES).toContain("O+");
    expect(BLOOD_TYPES).toContain("O-");
    expect(BLOOD_TYPES).toHaveLength(8);
  });
});

describe("DAYS_OF_WEEK", () => {
  it("contains all 7 days in order", () => {
    expect(DAYS_OF_WEEK[0]).toBe("monday");
    expect(DAYS_OF_WEEK[6]).toBe("sunday");
    expect(DAYS_OF_WEEK).toHaveLength(7);
  });
});
