import type { CalendarEventWithDates } from '../models/event'
import { formatTimeRange } from '../utils/dates'

type EventPopoverProps = {
  event: CalendarEventWithDates
  align?: 'left' | 'right'
  isClosing?: boolean
  onClose: () => void
  onEdit?: (eventId: string) => void
  onDelete?: (eventId: string) => void
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
  onDelete,
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
      {showActions && (onToggleComplete || onEdit || onDelete) && (
        <div className="popover-actions">
          {(onEdit || onDelete) && (
            <div className="popover-icon-actions">
              {onEdit && (
                <button
                  className="popover-icon-action"
                  type="button"
                  onClick={() => onEdit(event.id)}
                  aria-label="Editar evento"
                  title="Editar"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 20h4l10-10-4-4L4 16v4z" />
                    <path d="M13 7l4 4" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  className="popover-icon-action danger"
                  type="button"
                  onClick={() => onDelete(event.id)}
                  aria-label="Excluir evento"
                  title="Excluir"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 7h14" />
                    <path d="M9 7V5h6v2" />
                    <path d="M8 7l1 12h6l1-12" />
                  </svg>
                </button>
              )}
            </div>
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
