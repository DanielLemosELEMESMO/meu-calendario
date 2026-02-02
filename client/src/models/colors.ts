export type EventColor = {
  background: string
  foreground: string
}

export type ColorsPayload = {
  event: Record<string, EventColor>
  calendar?: Record<string, EventColor>
}
