import { useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
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
  selectedId: string | null
  onSelectEvent: (eventId: string | null) => void
  onToggleComplete: (eventId: string) => void
}

export default function DayColumn({
  label,
  date,
  events,
  highlightId,
  selectedId,
  onSelectEvent,
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
              const durationMinutes = Math.max(0, endMinutes - startMinutes)
              const height = Math.max(24, durationMinutes * PIXELS_PER_MINUTE)
              const density =
                durationMinutes < 20
                  ? 'short'
                  : durationMinutes < 45
                    ? 'medium'
                    : 'long'
              const isHighlighted = highlightId === event.id
              const isExpanded = selectedId === event.id
              return (
                <div
                  key={event.id}
                  className={[
                    'event-wrap',
                    isHighlighted ? 'event-pulse' : '',
                    isExpanded ? 'event-expanded-wrap' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-event-id={event.id}
                  style={
                    {
                      top: `${top}px`,
                      ['--event-height' as string]: `${height}px`,
                      ['--event-expanded-height' as string]: `${Math.max(
                        height,
                        120,
                      )}px`,
                    } as CSSProperties
                  }
                >
                  <EventCard
                    event={event}
                    density={density}
                    isExpanded={isExpanded}
                    onSelect={(eventId) =>
                      onSelectEvent(isExpanded ? null : eventId)
                    }
                    onToggleComplete={onToggleComplete}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
