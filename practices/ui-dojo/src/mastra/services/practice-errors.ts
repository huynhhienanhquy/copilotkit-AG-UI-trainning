/** A domain failure safe to expose at the practice HTTP/tool boundary. */
export class PracticeError extends Error {
  readonly code: string;
  readonly status: 400 | 404 | 409 | 413 | 415 | 500 | 502;

  /** Construct a public error; messages must not contain paths, SQL or secrets. */
  constructor(code: string, message: string, status: PracticeError["status"] = 400) {
    super(message);
    this.name = "PracticeError";
    this.code = code;
    this.status = status;
  }
}
