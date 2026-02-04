import type { ColorsPayload } from '../models/colors'
import type { CalendarEventWithDates } from '../models/event'

type EventQuickMenuProps = {
  event: CalendarEventWithDates
  colors: ColorsPayload | null
  x: number
  y: number
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onColorChange: (colorId?: string) => void
}

export default function EventQuickMenu({
  event,
  colors,
  x,
  y,
  onClose,
  onEdit,
  onDelete,
  onColorChange,
}: EventQuickMenuProps) {
  const eventColors = colors?.event ? Object.entries(colors.event) : []
  const estimatedWidth = 320
  const estimatedHeight = eventColors.length > 0 ? 220 : 150
  const left =
    typeof window === 'undefined'
      ? x
      : Math.max(12, Math.min(x, window.innerWidth - estimatedWidth - 12))
  const top =
    typeof window === 'undefined'
      ? y
      : Math.max(12, Math.min(y, window.innerHeight - estimatedHeight - 12))

  return (
    <div
      className="event-quick-menu"
      style={{ left, top }}
      role="menu"
      onContextMenu={(eventContext) => eventContext.preventDefault()}
    >
      <div className="event-quick-menu-title">{event.title || 'Evento'}</div>
      {eventColors.length > 0 && (
        <div className="event-quick-menu-palette">
          <button
            type="button"
            className={!event.colorId ? 'quick-color active' : 'quick-color'}
            onClick={() => {
              onColorChange(undefined)
              onClose()
            }}
            title="Cor padrao"
          >
            A
          </button>
          {eventColors.map(([colorId, palette]) => (
            <button
              key={colorId}
              type="button"
              className={event.colorId === colorId ? 'quick-color active' : 'quick-color'}
              style={{ background: palette.background, color: palette.foreground }}
              onClick={() => {
                onColorChange(colorId)
                onClose()
              }}
              title={`Cor ${colorId}`}
            >
              {colorId}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="event-quick-menu-action"
        onClick={() => {
          onEdit()
          onClose()
        }}
      >
        Editar
      </button>
      <button
        type="button"
        className="event-quick-menu-action danger"
        onClick={() => {
          onDelete()
          onClose()
        }}
      >
        Excluir
      </button>
    </div>
  )
}
