type CreateUserRequest = { body?: unknown; requestId: string };
type Response = { status: number; body: unknown };
type Dependencies = {
  users: { findByEmail(email: string): Promise<unknown>; create(input: { email: string }): Promise<{ id: string; email: string }> };
  log: { error(fields: Record<string, unknown>, message: string): void };
};

export async function createUser(request: CreateUserRequest, deps: Dependencies): Promise<Response> {
  const email = readEmail(request.body);
  if (!email) return { status: 400, body: { code: "INVALID_EMAIL" } };

  try {
    if (await deps.users.findByEmail(email)) {
      return { status: 409, body: { code: "EMAIL_ALREADY_EXISTS" } };
    }
    const user = await deps.users.create({ email });
    return { status: 201, body: { id: user.id, email: user.email } };
  } catch (error) {
    deps.log.error({ requestId: request.requestId, error }, "Failed to create user");
    return { status: 500, body: { code: "INTERNAL_ERROR", requestId: request.requestId } };
  }
}

function readEmail(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("email" in body)) return undefined;
  const email = String(body.email).trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : undefined;
}
