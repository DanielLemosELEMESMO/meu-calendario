import type { EventDraft } from '../models/event'

type EventFormPanelProps = {
  draft: EventDraft
  onChange: (draft: EventDraft) => void
  onSave: () => void
  onCancel: () => void
  className?: string
  style?: React.CSSProperties
}

const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const parseLocalInputValue = (value: string) => {
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) {
    return new Date()
  }
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0)
}

export default function EventFormPanel({
  draft,
  onChange,
  onSave,
  onCancel,
  className,
  style,
}: EventFormPanelProps) {
  return (
    <aside className={['event-form-panel', className].filter(Boolean).join(' ')} style={style}>
      <h3>Novo evento</h3>
      <label className="event-form-field">
        <span>Titulo</span>
        <input
          type="text"
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          placeholder="Digite um titulo"
        />
      </label>
      <label className="event-form-field">
        <span>Descricao</span>
        <textarea
          value={draft.description ?? ''}
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
          placeholder="Detalhes (opcional)"
          rows={4}
        />
      </label>
      <label className="event-form-field">
        <span>Inicio</span>
        <input
          type="datetime-local"
          value={toLocalInputValue(draft.start)}
          onChange={(event) =>
            onChange({ ...draft, start: parseLocalInputValue(event.target.value) })
          }
        />
      </label>
      <label className="event-form-field">
        <span>Fim</span>
        <input
          type="datetime-local"
          value={toLocalInputValue(draft.end)}
          onChange={(event) =>
            onChange({ ...draft, end: parseLocalInputValue(event.target.value) })
          }
        />
      </label>
      <div className="event-form-actions">
        <button type="button" className="event-form-cancel" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="event-form-save" onClick={onSave}>
          Salvar
        </button>
      </div>
    </aside>
  )
}
