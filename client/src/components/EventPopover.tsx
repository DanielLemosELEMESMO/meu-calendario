import type { CalendarEventWithDates } from '../models/event'
import { formatTimeRange } from '../utils/dates'

type EventPopoverProps = {
  event: CalendarEventWithDates
  align?: 'left' | 'right'
  isClosing?: boolean
  onClose: () => void
  onEdit?: (eventId: string) => void
  onToggleComplete?: (id: string) => void
  showActions?: boolean
  className?: string
  style?: React.CSSProperties
  popoverFor?: string
}

export default function EventPopover({
  event,
  align = 'right',
  isClosing = false,
  onClose,
  onEdit,
  onToggleComplete,
  showActions = true,
  className,
  style,
  popoverFor,
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
      data-popover-for={popoverFor}
    >
      <header className="popover-header">
        <div>
          <div className="popover-title">{event.title}</div>
          <div className="popover-time">{formatTimeRange(event.start, event.end)}</div>
        </div>
        <button className="popover-close" type="button" onClick={onClose}>
          X
        </button>
      </header>
      {event.description && (
        <p className="popover-description">{event.description}</p>
      )}
      {showActions && (onToggleComplete || onEdit) && (
        <div className="popover-actions">
          {onEdit && (
            <button
              className="popover-action"
              type="button"
              onClick={() => onEdit(event.id)}
            >
              Editar
            </button>
          )}
          {onToggleComplete && (
            <button
              className="popover-action"
              type="button"
              onClick={() => onToggleComplete(event.id)}
            >
              {event.completed ? 'Marcar pendente' : 'Concluir evento'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
