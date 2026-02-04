export type CalendarEvent = {
  id: string
  title: string
  description?: string
  start: string
  end: string
  calendarId: string
  colorId?: string
  color?: string
  completed: boolean
}

export type CalendarEventWithDates = Omit<CalendarEvent, 'start' | 'end'> & {
  start: Date
  end: Date
}

export type EventDraft = {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  calendarId?: string
  colorId?: string
}

export type CreateEventPayload = {
  title: string
  description?: string
  start: string
  end: string
  calendarId?: string
  colorId?: string | null
  timeZone?: string
}

export const withDates = (event: CalendarEvent): CalendarEventWithDates => ({
  ...event,
  start: new Date(event.start),
  end: new Date(event.end),
})
