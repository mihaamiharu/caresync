import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "./auth";

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("email");
  });

  it("rejects password shorter than 6 characters", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "abc",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("password");
  });

  it("rejects missing email", () => {
    const result = loginSchema.safeParse({ password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("infers LoginInput type correctly", () => {
    const input: LoginInput = {
      email: "user@example.com",
      password: "secret123",
    };
    const parsed = loginSchema.parse(input);
    expect(parsed).toEqual(input);
  });
});

describe("registerSchema", () => {
  it("accepts valid registration input", () => {
    const result = registerSchema.safeParse({
      email: "newuser@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(result.success).toBe(true);
  });

  it("defaults role to patient", () => {
    const result = registerSchema.safeParse({
      email: "newuser@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("patient");
    }
  });

  it("accepts optional phone number", () => {
    const result = registerSchema.safeParse({
      email: "newuser@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
      phone: "+1234567890",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+1234567890");
    }
  });

  it("rejects empty first name", () => {
    const result = registerSchema.safeParse({
      email: "newuser@example.com",
      password: "password123",
      firstName: "",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("firstName");
  });

  it("rejects empty last name", () => {
    const result = registerSchema.safeParse({
      email: "newuser@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("lastName");
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      email: "bad-email",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("email");
  });

  it("infers RegisterInput type correctly", () => {
    const input: RegisterInput = {
      email: "newuser@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
      role: "patient",
    };
    const parsed = registerSchema.parse(input);
    expect(parsed.email).toBe(input.email);
    expect(parsed.firstName).toBe(input.firstName);
  });
});
