import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, CalendarEventWithDates, EventDraft } from '../../models/event'
import { withDates } from '../../models/event'
import EventPopover from '../../components/EventPopover'
import EventFormPanel from '../../components/EventFormPanel'
import EventQuickMenu from '../../components/EventQuickMenu'
import {
  addDays,
  formatDayNumber,
  formatMonthYear,
  isSameDay,
  startOfDay,
} from '../../utils/dates'
import type { ColorsPayload } from '../../models/colors'

type MonthViewProps = {
  events: CalendarEvent[]
  onToggleComplete: (eventId: string) => void
  referenceDate: Date
  onEditEvent: (eventId: string, draft: EventDraft) => Promise<void>
  onDeleteEvent: (eventId: string) => Promise<void>
  onUpdateEventColor: (eventId: string, colorId?: string) => Promise<void>
  colors: ColorsPayload | null
}

export default function MonthView({
  events,
  onToggleComplete,
  referenceDate,
  onEditEvent,
  onDeleteEvent,
  onUpdateEventColor,
  colors,
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
  const containerRef = useRef<HTMLElement | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | undefined>(
    undefined,
  )
  const [panelSide, setPanelSide] = useState<'left' | 'right'>('right')
  const panelRafRef = useRef<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    event: CalendarEventWithDates
    x: number
    y: number
  } | null>(null)

  const toDraftFromEvent = (event: CalendarEventWithDates): EventDraft => ({
    id: event.id,
    title: event.title,
    description: event.description,
    start: new Date(event.start),
    end: new Date(event.end),
    calendarId: event.calendarId,
    colorId: event.colorId,
  })

  const handleStartEdit = (event: CalendarEventWithDates) => {
    setDraft(toDraftFromEvent(event))
    setEditingEventId(event.id)
    setSelectedId(null)
    setClosingId(null)
    setContextMenu(null)
  }

  const handleDeleteEvent = async (eventId: string) => {
    const shouldDelete = window.confirm('Excluir este evento?')
    if (!shouldDelete) return
    await onDeleteEvent(eventId)
    setSelectedId((current) => (current === eventId ? null : current))
    setDraft((current) => (current?.id === eventId ? null : current))
    setEditingEventId((current) => (current === eventId ? null : current))
  }

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
      if (
        !target.closest(`[data-event-id="${safeId}"]`) &&
        !target.closest('.event-popover')
      ) {
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

  useEffect(() => {
    if (!contextMenu) {
      return
    }

    const close = () => setContextMenu(null)
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.event-quick-menu')) {
        return
      }
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [contextMenu])

  useEffect(() => {
    if (!draft || !editingEventId || !containerRef.current) {
      setPanelStyle(undefined)
      return
    }

    const updatePanelPosition = () => {
      const safeEditingId =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(editingEventId)
          : editingEventId.replace(/"/g, '\\"')
      const anchor = containerRef.current?.querySelector<HTMLButtonElement>(
        `[data-event-id="${safeEditingId}"] .month-event`,
      )
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const panel = containerRef.current?.querySelector<HTMLElement>(
        '.event-form-panel.floating',
      )
      const panelRect = panel?.getBoundingClientRect()
      const width = panelRect?.width ?? 280
      const height = panelRect?.height ?? 320
      const gap = 16
      const fitsRight = rect.right + gap + width <= window.innerWidth
      const fitsLeft = rect.left - gap - width >= 0
      const useRight = fitsRight || !fitsLeft
      const left = useRight ? rect.right + gap : rect.left - gap - width
      const top = Math.min(
        Math.max(12, rect.top),
        Math.max(12, window.innerHeight - height - 12),
      )
      setPanelSide(useRight ? 'right' : 'left')
      setPanelStyle({
        position: 'fixed',
        left: Math.max(12, Math.min(left, window.innerWidth - width - 12)),
        top,
        width,
        maxHeight: window.innerHeight - 24,
        overflowY: 'auto',
      })
    }

    const scheduleUpdate = () => {
      if (panelRafRef.current) return
      panelRafRef.current = window.requestAnimationFrame(() => {
        panelRafRef.current = null
        updatePanelPosition()
      })
    }

    updatePanelPosition()
    window.requestAnimationFrame(updatePanelPosition)
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, true)
    return () => {
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate, true)
      if (panelRafRef.current) {
        window.cancelAnimationFrame(panelRafRef.current)
        panelRafRef.current = null
      }
    }
  }, [draft, editingEventId])

  return (
    <section className="month-view view-with-panel view-floating" ref={containerRef}>
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
                      onContextMenu={(eventContext) => {
                        eventContext.preventDefault()
                        eventContext.stopPropagation()
                        setSelectedId(event.id)
                        setContextMenu({
                          event,
                          x: eventContext.clientX,
                          y: eventContext.clientY,
                        })
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
                        onEdit={() => handleStartEdit(event)}
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
      {contextMenu && (
        <EventQuickMenu
          event={contextMenu.event}
          x={contextMenu.x}
          y={contextMenu.y}
          colors={colors}
          onClose={() => setContextMenu(null)}
          onEdit={() => handleStartEdit(contextMenu.event)}
          onDelete={() => handleDeleteEvent(contextMenu.event.id)}
          onColorChange={(colorId) => onUpdateEventColor(contextMenu.event.id, colorId)}
        />
      )}
      {draft && editingEventId && (
        <EventFormPanel
          draft={draft}
          onChange={setDraft}
          onCancel={() => {
            setDraft(null)
            setEditingEventId(null)
          }}
          onSave={async () => {
            if (!draft.title.trim()) {
              return
            }
            await onEditEvent(editingEventId, draft)
            setDraft(null)
            setEditingEventId(null)
          }}
          mode="edit"
          className={`floating panel-${panelSide}`}
          style={panelStyle}
          colors={colors}
        />
      )}
    </section>
  )
}
