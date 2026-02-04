import type { CalendarEvent, CreateEventPayload } from '../../models/event'
import type { ColorsPayload } from '../../models/colors'

export interface EventRepository {
  listRange(start: Date, end: Date): Promise<CalendarEvent[]>
  getColors(): Promise<ColorsPayload>
  toggleComplete(eventId: string): Promise<CalendarEvent | null>
  create(payload: CreateEventPayload): Promise<CalendarEvent>
  update(
    eventId: string,
    payload: Partial<CreateEventPayload>,
  ): Promise<CalendarEvent>
  delete(eventId: string): Promise<void>
}
