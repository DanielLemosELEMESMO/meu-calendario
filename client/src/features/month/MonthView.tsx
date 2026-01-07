import { useMemo, useState } from 'react'
import type { CalendarEvent } from '../../models/event'
import { withDates } from '../../models/event'
import EventPopover from '../../components/EventPopover'
import {
  addDays,
  formatDayNumber,
  formatMonthYear,
  isSameDay,
  startOfDay,
} from '../../utils/dates'

type MonthViewProps = {
  events: CalendarEvent[]
  onToggleComplete: (eventId: string) => void
  referenceDate: Date
}

export default function MonthView({
  events,
  onToggleComplete,
  referenceDate,
}: MonthViewProps) {
  const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const monthStart = startOfDay(firstDay)
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
  const startOffset = monthStart.getDay()
  const totalCells = Math.ceil((startOffset + monthEnd.getDate()) / 7) * 7
  const cells = Array.from({ length: totalCells }).map((_, index) =>
    addDays(monthStart, index - startOffset),
  )
  const eventDates = useMemo(() => events.map(withDates), [events])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <section className="month-view">
      <header className="month-header">
        <h2>{formatMonthYear(referenceDate)}</h2>
        <p>Uma leitura calma do mes, com destaque para dias carregados.</p>
      </header>
      <div className="month-grid">
        {cells.map((date, cellIndex) => {
          const dayEvents = eventDates.filter((event) =>
            isSameDay(event.start, date),
          )
          const isOutside = date.getMonth() !== referenceDate.getMonth()
          const align = cellIndex % 7 > 3 ? 'left' : 'right'
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
                  <div key={event.id} className="month-event-item">
                    <button
                      type="button"
                      className="month-event"
                      onClick={() =>
                        setSelectedId((current) =>
                          current === event.id ? null : event.id,
                        )
                      }
                    >
                      {event.title}
                    </button>
                    {selectedId === event.id && (
                      <EventPopover
                        event={event}
                        align={align}
                        onClose={() => setSelectedId(null)}
                        onToggleComplete={onToggleComplete}
                      />
                    )}
                  </div>
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
