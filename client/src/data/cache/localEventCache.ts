import type { CalendarEvent } from '../../models/event'

const CACHE_KEY = 'meucalendario.events.v0'
const CACHE_TTL_MS = 1000 * 60 * 60 * 12

type CachePayload = {
  expiresAt: number
  events: CalendarEvent[]
}

export const loadEventCache = (): CachePayload | null => {
  const raw = localStorage.getItem(CACHE_KEY)
  if (!raw) {
    return null
  }

  try {
    const payload = JSON.parse(raw) as CachePayload
    if (!payload.expiresAt || !Array.isArray(payload.events)) {
      return null
    }
    if (Date.now() > payload.expiresAt) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export const saveEventCache = (events: CalendarEvent[]) => {
  const payload: CachePayload = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    events,
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
}

export const clearEventCache = () => {
  localStorage.removeItem(CACHE_KEY)
}
