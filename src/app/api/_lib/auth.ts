export function checkTeacherPin(pin: unknown): boolean {
  const expected = process.env.TEACHER_PIN;
  if (!expected) return false;
  return typeof pin === "string" && pin === expected;
}
