import { useEffect, useMemo, useState } from 'react'
import DayColumn from './DayColumn'
import type { CalendarEvent } from '../../models/event'
import { addDays, isSameDay, startOfDay } from '../../utils/dates'

type FocusViewProps = {
  events: CalendarEvent[]
  onToggleComplete: (eventId: string) => void
  referenceDate: Date
}

export default function FocusView({
  events,
  onToggleComplete,
  referenceDate,
}: FocusViewProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const days = useMemo(() => {
    const today = startOfDay(referenceDate)
    return [
      { label: 'Ontem', date: addDays(today, -1) },
      { label: 'Hoje', date: today },
      { label: 'Amanha', date: addDays(today, 1) },
    ]
  }, [referenceDate])

  const eventsByDay = useMemo(
    () =>
      days.map(({ date }) =>
        events.filter((event) => isSameDay(new Date(event.start), date)),
      ),
    [days, events],
  )

  useEffect(() => {
    const todayEvents = events.find((event) => {
      const start = new Date(event.start)
      const end = new Date(event.end)
      return isSameDay(start, referenceDate) && new Date() >= start && new Date() <= end
    })

    if (todayEvents) {
      setHighlightedId(todayEvents.id)
      const timeout = window.setTimeout(() => setHighlightedId(null), 1600)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [events, referenceDate])

  return (
    <section className="focus-view">
      {days.map((day, index) => (
        <DayColumn
          key={day.label}
          label={day.label}
          date={day.date}
          events={eventsByDay[index]}
          highlightId={highlightedId}
          onToggleComplete={onToggleComplete}
        />
      ))}
    </section>
  )
}
