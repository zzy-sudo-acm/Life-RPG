export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
export function nowIso(): string {
  return new Date().toISOString()
}
