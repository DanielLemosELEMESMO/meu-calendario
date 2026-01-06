import type { CalendarEventWithDates } from '../models/event'
import { formatTimeRange, isNowWithin } from '../utils/dates'

type EventCardProps = {
  event: CalendarEventWithDates
  onToggleComplete: (id: string) => void
}

export default function EventCard({ event, onToggleComplete }: EventCardProps) {
  const isActive = isNowWithin(event.start, event.end)

  return (
    <article
      className={[
        'event-card',
        event.completed ? 'event-completed' : '',
        isActive ? 'event-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ borderColor: event.color || 'var(--accent-2)' }}
    >
      <header className="event-header">
        <span className="event-time">{formatTimeRange(event.start, event.end)}</span>
        <button
          className="event-check"
          type="button"
          aria-label={event.completed ? 'Marcar como pendente' : 'Marcar como concluido'}
          onClick={() => onToggleComplete(event.id)}
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
    </article>
  )
}
