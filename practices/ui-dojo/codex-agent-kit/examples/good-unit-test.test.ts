import { describe, expect, it, vi } from "vitest";
import { createUser } from "./good-api-handler";

describe("createUser", () => {
  it("creates a normalized user and returns the public contract", async () => {
    const users = { findByEmail: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "u1", email: "dev@example.com" }) };
    const log = { error: vi.fn() };

    const result = await createUser({ body: { email: " Dev@Example.com " }, requestId: "req-1" }, { users, log });

    expect(result).toEqual({ status: 201, body: { id: "u1", email: "dev@example.com" } });
    expect(users.create).toHaveBeenCalledWith({ email: "dev@example.com" });
    expect(log.error).not.toHaveBeenCalled();
  });

  it("rejects invalid input without touching persistence", async () => {
    const users = { findByEmail: vi.fn(), create: vi.fn() };
    const result = await createUser({ body: { email: "invalid" }, requestId: "req-2" }, { users, log: { error: vi.fn() } });

    expect(result).toEqual({ status: 400, body: { code: "INVALID_EMAIL" } });
    expect(users.findByEmail).not.toHaveBeenCalled();
  });
});
