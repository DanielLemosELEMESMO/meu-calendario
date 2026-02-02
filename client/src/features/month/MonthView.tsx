import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [closingId, setClosingId] = useState<string | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  const requestClose = () => {
    if (!selectedId) {
      return
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
    }
    setClosingId(selectedId)
    closeTimerRef.current = window.setTimeout(() => {
      setSelectedId(null)
      setClosingId(null)
      closeTimerRef.current = null
    }, 180)
  }

  useEffect(() => {
    if (!selectedId) {
      return
    }

    const safeId =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(selectedId)
        : selectedId.replace(/"/g, '\\"')

    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) {
        return
      }
      if (!target.closest(`[data-event-id="${safeId}"]`)) {
        requestClose()
      }
    }

    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [selectedId])

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    },
    [],
  )

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
                  <div
                    key={event.id}
                    className="month-event-item"
                    data-event-id={event.id}
                  >
                    <button
                      type="button"
                      className={
                        [
                          'month-event',
                          selectedId === event.id ? 'month-event-selected' : '',
                          event.end.getTime() < Date.now() ? 'month-event-past' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')
                      }
                      style={
                        event.color
                          ? ({ ['--event-bg' as string]: event.color } as React.CSSProperties)
                          : undefined
                      }
                      onClick={() => {
                        if (closeTimerRef.current) {
                          window.clearTimeout(closeTimerRef.current)
                          closeTimerRef.current = null
                        }
                        setClosingId(null)
                        setSelectedId((current) =>
                          current === event.id ? null : event.id,
                        )
                      }}
                    >
                      <span
                        className={
                          event.end.getTime() < Date.now()
                            ? 'month-event-text month-event-text-past'
                            : 'month-event-text'
                        }
                      >
                        {event.title}
                      </span>
                    </button>
                    {selectedId === event.id && (
                      <EventPopover
                        event={event}
                        align={align}
                        isClosing={closingId === event.id}
                        onClose={requestClose}
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
