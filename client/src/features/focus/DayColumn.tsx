import { useEffect, useMemo, useRef } from 'react'
import EventCard from '../../components/EventCard'
import type { CalendarEvent } from '../../models/event'
import { withDates } from '../../models/event'
import {
  formatDayLabel,
  isSameDay,
  minutesSinceStart,
  startOfDay,
} from '../../utils/dates'

const PIXELS_PER_MINUTE = 1.1
const DAY_HEIGHT = 24 * 60 * PIXELS_PER_MINUTE

type DayColumnProps = {
  label: string
  date: Date
  events: CalendarEvent[]
  highlightId: string | null
  onToggleComplete: (eventId: string) => void
}

export default function DayColumn({
  label,
  date,
  events,
  highlightId,
  onToggleComplete,
}: DayColumnProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const dayStart = useMemo(() => startOfDay(date), [date])
  const isToday = isSameDay(date, new Date())

  const eventsWithDates = useMemo(
    () => events.map(withDates),
    [events],
  )

  useEffect(() => {
    if (!isToday || !scrollRef.current) {
      return
    }
    const nowMinutes = minutesSinceStart(new Date())
    const offset = nowMinutes * PIXELS_PER_MINUTE
    const container = scrollRef.current
    const target = Math.max(0, offset - container.clientHeight * 0.35)
    requestAnimationFrame(() => {
      container.scrollTop = target
    })
  }, [isToday])

  return (
    <section className="day-column">
      <header className="day-header">
        <span className="day-label">{label}</span>
        <span className="day-date">{formatDayLabel(date)}</span>
      </header>
      <div className="day-body" ref={scrollRef}>
        <div className="day-grid" style={{ height: `${DAY_HEIGHT}px` }}>
          {Array.from({ length: 24 }).map((_, hour) => (
            <div key={hour} className="hour-row">
              <span className="hour-label">{hour.toString().padStart(2, '0')}</span>
            </div>
          ))}
          {isToday && (
            <div
              className="now-line"
              style={{
                top: `${minutesSinceStart(new Date()) * PIXELS_PER_MINUTE}px`,
              }}
            />
          )}
          <div className="events-layer">
            {eventsWithDates.map((event) => {
              const startMinutes = minutesSinceStart(event.start)
              const endMinutes = minutesSinceStart(event.end)
              const top = startMinutes * PIXELS_PER_MINUTE
              const height = Math.max(36, (endMinutes - startMinutes) * PIXELS_PER_MINUTE)
              const isHighlighted = highlightId === event.id
              return (
                <div
                  key={event.id}
                  className={isHighlighted ? 'event-wrap event-pulse' : 'event-wrap'}
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <EventCard event={event} onToggleComplete={onToggleComplete} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
