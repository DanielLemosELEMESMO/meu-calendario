import type { CalendarEvent } from '../../models/event'

export interface EventRepository {
  listRange(start: Date, end: Date): Promise<CalendarEvent[]>
  toggleComplete(eventId: string): Promise<CalendarEvent | null>
}
