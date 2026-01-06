import type { CalendarEvent } from '../../models/event'
import {
  addDays,
  formatDayNumber,
  formatMonthYear,
  isSameDay,
  startOfDay,
} from '../../utils/dates'

type MonthViewProps = {
  events: CalendarEvent[]
  referenceDate: Date
}

export default function MonthView({ events, referenceDate }: MonthViewProps) {
  const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const monthStart = startOfDay(firstDay)
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
  const startOffset = monthStart.getDay()
  const totalCells = Math.ceil((startOffset + monthEnd.getDate()) / 7) * 7
  const cells = Array.from({ length: totalCells }).map((_, index) =>
    addDays(monthStart, index - startOffset),
  )

  return (
    <section className="month-view">
      <header className="month-header">
        <h2>{formatMonthYear(referenceDate)}</h2>
        <p>Uma leitura calma do mes, com destaque para dias carregados.</p>
      </header>
      <div className="month-grid">
        {cells.map((date) => {
          const dayEvents = events.filter((event) =>
            isSameDay(new Date(event.start), date),
          )
          const isOutside = date.getMonth() !== referenceDate.getMonth()
          return (
            <div
              key={date.toISOString()}
              className={isOutside ? 'month-day month-day-outside' : 'month-day'}
            >
              <div className="month-day-header">
                <span>{formatDayNumber(date)}</span>
                {dayEvents.length > 0 && (
                  <span className="month-count">{dayEvents.length}</span>
                )}
              </div>
              <div className="month-day-events">
                {dayEvents.slice(0, 2).map((event) => (
                  <span key={event.id} className="month-event">
                    {event.title}
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span className="month-more">+{dayEvents.length - 2}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
