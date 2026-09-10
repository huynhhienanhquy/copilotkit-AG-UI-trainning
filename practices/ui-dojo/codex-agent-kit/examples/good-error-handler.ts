import { randomUUID } from "node:crypto";

interface AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
  isOperational: boolean;
}

interface StructuredLogger {
  error(
    context: {
      requestId: string;
      errorCode: string;
      statusCode: number;
      error?: unknown;
    },
    message: string
  ): void;
}

interface HandlerDependencies {
  // Bind this interface to the repository's structured logger (for example,
  // Pino or Winston). Do not replace it with console in production code.
  log: StructuredLogger;
}

function createAppError(
  message: string,
  code: string,
  statusCode: number,
  details?: Record<string, unknown>
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  error.isOperational = true;
  return error;
}

function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    "statusCode" in error &&
    typeof error.statusCode === "number" &&
    "isOperational" in error &&
    error.isOperational === true
  );
}

function handleError(error: unknown, requestId: string, log: StructuredLogger) {
  if (isAppError(error)) {
    log.error({
      requestId,
      errorCode: error.code,
      statusCode: error.statusCode,
      error,
    }, "Request failed");

    return {
      status: error.statusCode,
      body: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    };
  }

  log.error({
    requestId,
    errorCode: "INTERNAL_ERROR",
    statusCode: 500,
    error,
  }, "Unhandled error");

  return {
    status: 500,
    body: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      requestId,
    },
  };
}

async function handler(
  req: { body: { email?: string }; requestId?: string },
  { log }: HandlerDependencies
) {
  const requestId = req.requestId ?? randomUUID();

  try {
    if (!req.body.email) {
      throw createAppError("Email is required", "VALIDATION_ERROR", 400, {
        field: "email",
      });
    }

    const email = req.body.email.trim().toLowerCase();

    if (!email.includes("@")) {
      throw createAppError("Invalid email format", "VALIDATION_ERROR", 400, {
        field: "email",
      });
    }

    return { status: 200, body: { email } };
  } catch (error) {
    return handleError(error, requestId, log);
  }
}
