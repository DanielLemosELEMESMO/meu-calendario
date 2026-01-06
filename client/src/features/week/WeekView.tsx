import type { CalendarEvent } from '../../models/event'
import { withDates } from '../../models/event'
import {
  addDays,
  formatDayLabel,
  isSameDay,
  startOfDay,
} from '../../utils/dates'

type WeekViewProps = {
  events: CalendarEvent[]
  referenceDate: Date
}

export default function WeekView({ events, referenceDate }: WeekViewProps) {
  const start = startOfDay(addDays(referenceDate, -referenceDate.getDay()))
  const days = Array.from({ length: 7 }).map((_, index) => addDays(start, index))
  const eventDates = events.map(withDates)

  return (
    <section className="week-view">
      <header className="week-header">
        <h2>Semana em movimento</h2>
        <p>Uma visao panoramica para equilibrar foco e ritmo.</p>
      </header>
      <div className="week-grid">
        {days.map((day) => {
          const dayEvents = eventDates.filter((event) =>
            isSameDay(event.start, day),
          )
          return (
            <div key={day.toISOString()} className="week-day">
              <div className="week-day-header">{formatDayLabel(day)}</div>
              <div className="week-day-events">
                {dayEvents.length === 0 && (
                  <span className="week-empty">Sem eventos</span>
                )}
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="week-event"
                    style={{ borderColor: event.color || 'var(--accent-2)' }}
                  >
                    <span className="week-event-title">{event.title}</span>
                    <span className="week-event-time">
                      {event.start.getHours().toString().padStart(2, '0')}:
                      {event.start.getMinutes().toString().padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
