import type { CalendarEvent, CreateEventPayload } from '../../models/event'
import type { ColorsPayload } from '../../models/colors'
import { createMockEvents } from '../mocks/mockEvents'
import { loadEventCache, saveEventCache } from '../cache/localEventCache'
import type { EventRepository } from './EventRepository'

const ensureEvents = (): CalendarEvent[] => {
  const cached = loadEventCache()
  if (cached) {
    return cached.events
  }
  const seeded = createMockEvents()
  saveEventCache(seeded)
  return seeded
}

export class MockEventRepository implements EventRepository {
  async listRange(start: Date, end: Date): Promise<CalendarEvent[]> {
    const events = ensureEvents()
    return events.filter((event) => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      return eventEnd >= start && eventStart <= end
    })
  }

  async getColors(): Promise<ColorsPayload> {
    return {
      event: {
        '1': { background: '#fef3c7', foreground: '#111827' },
        '2': { background: '#dbeafe', foreground: '#111827' },
        '3': { background: '#dcfce7', foreground: '#111827' },
        '4': { background: '#fee2e2', foreground: '#111827' },
      },
    }
  }

  async toggleComplete(eventId: string): Promise<CalendarEvent | null> {
    const events = ensureEvents()
    const index = events.findIndex((event) => event.id === eventId)
    if (index === -1) {
      return null
    }
    const updated: CalendarEvent = {
      ...events[index],
      completed: !events[index].completed,
    }
    const nextEvents = [...events]
    nextEvents[index] = updated
    saveEventCache(nextEvents)
    return updated
  }

  async create(payload: CreateEventPayload): Promise<CalendarEvent> {
    const events = ensureEvents()
    const created: CalendarEvent = {
      id: `mock-${Date.now()}`,
      title: payload.title,
      description: payload.description,
      start: payload.start,
      end: payload.end,
      calendarId: payload.calendarId ?? 'mock',
      completed: false,
    }
    const nextEvents = [...events, created]
    saveEventCache(nextEvents)
    return created
  }

  async update(
    eventId: string,
    payload: Partial<CreateEventPayload>,
  ): Promise<CalendarEvent> {
    const events = ensureEvents()
    const index = events.findIndex((event) => event.id === eventId)
    if (index === -1) {
      throw new Error('Evento nao encontrado')
    }
    const updated: CalendarEvent = {
      ...events[index],
      ...payload,
      colorId: payload.colorId ?? undefined,
      completed: events[index].completed,
    }
    const nextEvents = [...events]
    nextEvents[index] = updated
    saveEventCache(nextEvents)
    return updated
  }

  async delete(eventId: string): Promise<void> {
    const events = ensureEvents()
    const nextEvents = events.filter((event) => event.id !== eventId)
    saveEventCache(nextEvents)
  }
}
