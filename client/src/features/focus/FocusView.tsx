import { useEffect, useMemo, useRef, useState } from 'react'
import DayColumn from './DayColumn'
import type { CalendarEvent, EventDraft } from '../../models/event'
import { addDays, isSameDay, startOfDay } from '../../utils/dates'
import EventFormPanel from '../../components/EventFormPanel'

type FocusViewProps = {
  events: CalendarEvent[]
  onToggleComplete: (eventId: string) => void
  referenceDate: Date
  onCreateEvent: (draft: EventDraft) => Promise<void>
}

export default function FocusView({
  events,
  onToggleComplete,
  referenceDate,
  onCreateEvent,
}: FocusViewProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | undefined>(
    undefined,
  )
  const [panelSide, setPanelSide] = useState<'left' | 'right'>('right')

  useEffect(() => {
    if (!draft) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDraft(null)
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.defaultPrevented) {
        return
      }
      const target = event.target as HTMLElement | null
      if (!target) {
        return
      }
      if (target.closest('.draft-event') || target.closest('.event-form-panel')) {
        return
      }
      setDraft(null)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [draft])

  const days = useMemo(() => {
    const today = startOfDay(referenceDate)
    return [
      { label: 'Ontem', date: addDays(today, -1) },
      { label: 'Hoje', date: today },
      { label: 'Amanha', date: addDays(today, 1) },
    ]
  }, [referenceDate])

  const eventsByDay = useMemo(
    () =>
      days.map(({ date }) =>
        events.filter((event) => isSameDay(new Date(event.start), date)),
      ),
    [days, events],
  )

  useEffect(() => {
    const todayEvents = events.find((event) => {
      const start = new Date(event.start)
      const end = new Date(event.end)
      return isSameDay(start, referenceDate) && new Date() >= start && new Date() <= end
    })

    if (todayEvents) {
      setHighlightedId(todayEvents.id)
      const timeout = window.setTimeout(() => setHighlightedId(null), 1600)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [events, referenceDate])

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
        setSelectedId(null)
      }
    }

    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [selectedId])

  return (
    <section className="view-with-panel view-floating" ref={containerRef}>
      <div className="focus-view">
        {days.map((day, index) => (
          <DayColumn
            key={day.label}
            label={day.label}
            date={day.date}
            events={eventsByDay[index]}
            highlightId={highlightedId}
            selectedId={selectedId}
            onSelectEvent={setSelectedId}
            onToggleComplete={onToggleComplete}
            draft={draft}
            onDraftChange={setDraft}
            onDraftSelect={() => setSelectedId(null)}
            onDraftLayout={(rect) => {
              if (!rect || !containerRef.current) {
                return
              }
              const containerRect = containerRef.current.getBoundingClientRect()
              const gap = 16
              const availableRight = containerRect.right - rect.right
              const availableLeft = rect.left - containerRect.left
              const width = 280
              const useRight = availableRight >= width + gap || availableRight >= availableLeft
              const left = useRight
                ? rect.right - containerRect.left + gap
                : rect.left - containerRect.left - width - gap
              const top = Math.max(0, rect.top - containerRect.top)
              setPanelSide(useRight ? 'right' : 'left')
              setPanelStyle({ left, top, width })
            }}
          />
        ))}
      </div>
      {draft && (
        <EventFormPanel
          draft={draft}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={async () => {
            if (!draft.title.trim()) {
              return
            }
            await onCreateEvent(draft)
            setDraft(null)
          }}
          className={`floating panel-${panelSide}`}
          style={panelStyle}
        />
      )}
    </section>
  )
}
