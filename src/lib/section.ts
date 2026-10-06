// Reads the optional ?section= filter used by the teacher's section picker.
export function sectionParam(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
