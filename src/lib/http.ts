// Small helpers for request validation and error responses.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function bad(message: string): never {
  throw new HttpError(400, message);
}

export function notFound(what: string): never {
  throw new HttpError(404, `${what} not found.`);
}

export function str(value: unknown, field: string, opts: { required?: boolean; max?: number } = {}): string {
  const v = typeof value === "string" ? value.trim() : "";
  if (opts.required && !v) bad(`${field} is required.`);
  if (opts.max && v.length > opts.max) bad(`${field} is too long (max ${opts.max}).`);
  return v;
}

export function num(value: unknown, field: string, opts: { min?: number; max?: number } = {}): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(n)) bad(`${field} must be a number.`);
  if (opts.min !== undefined && n < opts.min) bad(`${field} must be at least ${opts.min}.`);
  if (opts.max !== undefined && n > opts.max) bad(`${field} must be at most ${opts.max}.`);
  return n;
}

export function intParam(value: string | undefined, field: string): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(n) || n < 1) bad(`${field} must be a positive integer.`);
  return n;
}
