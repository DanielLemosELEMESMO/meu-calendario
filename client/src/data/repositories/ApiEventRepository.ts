import type { CalendarEvent, CreateEventPayload } from '../../models/event'
import type { ColorsPayload } from '../../models/colors'
import type { EventRepository } from './EventRepository'

export class ApiEventRepository implements EventRepository {
  private events: CalendarEvent[] = []

  async listRange(start: Date, end: Date): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    })
    const response = await fetch(`/api/events?${params.toString()}`, {
      credentials: 'include',
    })
    if (response.status === 401) {
      throw new Error('unauthorized')
    }
    if (!response.ok) {
      throw new Error('Falha ao buscar eventos.')
    }
    const payload = (await response.json()) as { events: CalendarEvent[] }
    this.events = payload.events
    return this.events
  }

  async getColors(): Promise<ColorsPayload> {
    const response = await fetch('/api/colors', { credentials: 'include' })
    if (response.status === 401) {
      throw new Error('unauthorized')
    }
    if (!response.ok) {
      throw new Error('Falha ao buscar cores.')
    }
    const payload = (await response.json()) as { colors: ColorsPayload }
    return payload.colors
  }

  async toggleComplete(eventId: string): Promise<CalendarEvent | null> {
    const index = this.events.findIndex((event) => event.id === eventId)
    if (index === -1) {
      return null
    }

    const updated: CalendarEvent = {
      ...this.events[index],
      completed: !this.events[index].completed,
    }

    const response = await fetch('/api/event-status', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, completed: updated.completed }),
    })
    if (response.status === 401) {
      throw new Error('unauthorized')
    }
    if (!response.ok) {
      throw new Error('Falha ao atualizar status.')
    }

    this.events = [...this.events]
    this.events[index] = updated
    return updated
  }

  async create(payload: CreateEventPayload): Promise<CalendarEvent> {
    const response = await fetch('/api/events', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (response.status === 401) {
      throw new Error('unauthorized')
    }
    if (!response.ok) {
      throw new Error('Falha ao criar evento.')
    }
    const created = (await response.json()) as { event: CalendarEvent }
    return created.event
  }

  async update(
    eventId: string,
    payload: Partial<CreateEventPayload>,
  ): Promise<CalendarEvent> {
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (response.status === 401) {
      throw new Error('unauthorized')
    }
    if (!response.ok) {
      throw new Error('Falha ao atualizar evento.')
    }
    const updated = (await response.json()) as { event: CalendarEvent }
    return updated.event
  }

  async delete(eventId: string): Promise<void> {
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (response.status === 401) {
      throw new Error('unauthorized')
    }
    if (!response.ok) {
      throw new Error('Falha ao excluir evento.')
    }
  }
}
