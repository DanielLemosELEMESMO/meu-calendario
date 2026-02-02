import type { CalendarEventWithDates } from '../models/event'
import { formatTimeRange, isNowWithin } from '../utils/dates'

type EventDensity = 'short' | 'medium' | 'long'

type EventCardProps = {
  event: CalendarEventWithDates
  density: EventDensity
  isExpanded: boolean
  onSelect: (id: string) => void
  onToggleComplete: (id: string) => void
}

export default function EventCard({
  event,
  density,
  isExpanded,
  onSelect,
  onToggleComplete,
}: EventCardProps) {
  const isActive = isNowWithin(event.start, event.end)
  const isPast = event.end.getTime() < Date.now()
  const timeLabel = formatTimeRange(event.start, event.end)
  return (
    <article
      className={[
        'event-card',
        isPast ? 'event-past' : '',
        event.completed ? 'event-completed' : '',
        isActive ? 'event-active' : '',
        density === 'short' ? 'event-short' : '',
        density === 'long' ? 'event-long' : '',
        isExpanded ? 'event-expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        event.color
          ? ({ ['--event-bg' as string]: event.color } as React.CSSProperties)
          : undefined
      }
      onClick={() => onSelect(event.id)}
    >
      {density !== 'long' ? (
        <div className="event-compact">
          <span className="event-compact-time">{timeLabel}</span>
          <span className="event-compact-title">{event.title}</span>
          <button
            className="event-check"
            type="button"
            aria-label={
              event.completed ? 'Marcar como pendente' : 'Marcar como concluido'
            }
            onClick={(eventClick) => {
              eventClick.stopPropagation()
              onToggleComplete(event.id)
            }}
          >
            {event.completed ? 'V' : ' '}
          </button>
        </div>
      ) : (
        <>
          <header className="event-header">
            <span className="event-time">{timeLabel}</span>
            <button
              className="event-check"
              type="button"
              aria-label={
                event.completed ? 'Marcar como pendente' : 'Marcar como concluido'
              }
              onClick={(eventClick) => {
                eventClick.stopPropagation()
                onToggleComplete(event.id)
              }}
            >
              {event.completed ? 'V' : ' '}
            </button>
          </header>
          <h4 className="event-title">
            {event.title}
            {event.completed && <span className="event-checkmark">V</span>}
          </h4>
          {event.description && (
            <p className="event-description">{event.description}</p>
          )}
        </>
      )}
    </article>
  )
}
