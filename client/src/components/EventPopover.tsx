import type { CalendarEventWithDates } from '../models/event'
import { formatTimeRange } from '../utils/dates'

type EventPopoverProps = {
  event: CalendarEventWithDates
  align?: 'left' | 'right'
  isClosing?: boolean
  onClose: () => void
  onToggleComplete: (id: string) => void
}

export default function EventPopover({
  event,
  align = 'right',
  isClosing = false,
  onClose,
  onToggleComplete,
}: EventPopoverProps) {
  return (
    <div
      className={`event-popover popover-${align} ${
        isClosing ? 'popover-exit' : ''
      }`.trim()}
    >
      <header className="popover-header">
        <div>
          <div className="popover-title">{event.title}</div>
          <div className="popover-time">{formatTimeRange(event.start, event.end)}</div>
        </div>
        <button className="popover-close" type="button" onClick={onClose}>
          ( x )
        </button>
      </header>
      {event.description && (
        <p className="popover-description">{event.description}</p>
      )}
      <div className="popover-actions">
        <button
          className="popover-action"
          type="button"
          onClick={() => onToggleComplete(event.id)}
        >
          {event.completed ? 'Marcar pendente' : 'Concluir evento'}
        </button>
      </div>
    </div>
  )
}
