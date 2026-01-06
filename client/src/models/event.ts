export type CalendarEvent = {
  id: string
  title: string
  description?: string
  start: string
  end: string
  calendarId: string
  color?: string
  completed: boolean
}

export type CalendarEventWithDates = Omit<CalendarEvent, 'start' | 'end'> & {
  start: Date
  end: Date
}

export const withDates = (event: CalendarEvent): CalendarEventWithDates => ({
  ...event,
  start: new Date(event.start),
  end: new Date(event.end),
})
