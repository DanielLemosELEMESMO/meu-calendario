import type { CalendarEventWithDates } from '../models/event'
import { formatTimeRange } from '../utils/dates'

type EventPopoverProps = {
  event: CalendarEventWithDates
  align?: 'left' | 'right'
  isClosing?: boolean
  onClose: () => void
  onToggleComplete?: (id: string) => void
  showActions?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function EventPopover({
  event,
  align = 'right',
  isClosing = false,
  onClose,
  onToggleComplete,
  showActions = true,
  className,
  style,
}: EventPopoverProps) {
  return (
    <div
      className={[
        'event-popover',
        `popover-${align}`,
        isClosing ? 'popover-exit' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
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
      {showActions && onToggleComplete && (
        <div className="popover-actions">
          <button
            className="popover-action"
            type="button"
            onClick={() => onToggleComplete(event.id)}
          >
            {event.completed ? 'Marcar pendente' : 'Concluir evento'}
          </button>
        </div>
      )}
    </div>
  )
}
