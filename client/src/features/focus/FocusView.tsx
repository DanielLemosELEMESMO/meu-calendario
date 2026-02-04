import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import DayColumn from './DayColumn'
import type { CalendarEvent, CalendarEventWithDates, EventDraft } from '../../models/event'
import { withDates } from '../../models/event'
import { addDays, isSameDay, minutesSinceStart, startOfDay } from '../../utils/dates'
import EventFormPanel from '../../components/EventFormPanel'
import EventQuickMenu from '../../components/EventQuickMenu'
import type { ColorsPayload } from '../../models/colors'

const PIXELS_PER_MINUTE = 1.1
const ROUND_STEP = 5
const FOCUS_LAYER_LEFT = 25
const FOCUS_LAYER_RIGHT = 10

type FocusViewProps = {
  events: CalendarEvent[]
  onToggleComplete: (eventId: string) => void
  referenceDate: Date
  onCreateEvent: (draft: EventDraft) => Promise<void>
  onUpdateEventTime: (
    eventId: string,
    start: Date,
    end: Date,
    commit: boolean,
  ) => Promise<void>
  onEditEvent: (eventId: string, draft: EventDraft) => Promise<void>
  onDeleteEvent: (eventId: string) => Promise<void>
  onUpdateEventColor: (eventId: string, colorId?: string) => Promise<void>
  colors: ColorsPayload | null
}

export default function FocusView({
  events,
  onToggleComplete,
  referenceDate,
  onCreateEvent,
  onUpdateEventTime,
  onEditEvent,
  onDeleteEvent,
  onUpdateEventColor,
  colors,
}: FocusViewProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    event: CalendarEventWithDates
    x: number
    y: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | undefined>(
    undefined,
  )
  const [panelSide, setPanelSide] = useState<'left' | 'right'>('right')
  const [draftAnchorNode, setDraftAnchorNode] = useState<HTMLDivElement | null>(
    null,
  )
  const panelRafRef = useRef<number | null>(null)
  const dragLayerRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    event: CalendarEventWithDates
    grabOffsetMinutes: number
    durationMinutes: number
    mode: 'move' | 'resize-start' | 'resize-end'
  } | null>(null)
  const latestRangeRef = useRef<{ start: Date; end: Date } | null>(null)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const rafRef = useRef<number | null>(null)
  const cancelDragRef = useRef(false)
  const [draggingEvent, setDraggingEvent] = useState<CalendarEventWithDates | null>(
    null,
  )
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null)
  const dragLabelRef = useRef<HTMLSpanElement | null>(null)

  const formatTime = (date: Date) =>
    `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`

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
    setContextMenu(null)
  }

  const handleSelectPreview = (eventId: string | null) => {
    setSelectedId(eventId)
    if (eventId) {
      setDraft(null)
      setEditingEventId(null)
      setContextMenu(null)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    const shouldDelete = window.confirm('Excluir este evento?')
    if (!shouldDelete) return
    await onDeleteEvent(eventId)
    setSelectedId((current) => (current === eventId ? null : current))
    setDraft((current) => (current?.id === eventId ? null : current))
    setEditingEventId((current) => (current === eventId ? null : current))
  }

  useEffect(() => {
    if (!draft) {
      setDraftAnchorNode(null)
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

  const days = useMemo(() => {
    const today = startOfDay(referenceDate)
    return [
      { label: 'Ontem', date: addDays(today, -1) },
      { label: 'Hoje', date: today },
      { label: 'Amanha', date: addDays(today, 1) },
    ]
  }, [referenceDate])

  const eventsWithDates = useMemo(
    () => events.map(withDates),
    [events],
  )

  const eventsByDay = useMemo(
    () =>
      days.map(({ date }) =>
        eventsWithDates.filter((event) => isSameDay(event.start, date)),
      ),
    [days, eventsWithDates],
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
      if (
        !target.closest(`[data-event-id="${safeId}"]`) &&
        !target.closest(`[data-popover-for="${safeId}"]`) &&
        !target.closest('.event-popover')
      ) {
        setSelectedId(null)
      }
    }

    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [selectedId])

  const applyDragPosition = () => {
    if (!containerRef.current || !dragLayerRef.current || !dragStateRef.current) {
      return
    }
    if (!lastPointerRef.current) {
      return
    }
    const { x, y } = lastPointerRef.current
    const grids = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.day-grid'),
    )
    const targetGrid =
      grids.find((item) => {
        const rect = item.getBoundingClientRect()
        return x >= rect.left && x <= rect.right
      }) ?? grids[0]
    if (!targetGrid) {
      return
    }
    const rect = targetGrid.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    const offsetY = Math.min(Math.max(0, y - rect.top), rect.height)
    const pointerMinutes =
      Math.round(offsetY / PIXELS_PER_MINUTE / ROUND_STEP) * ROUND_STEP
    const dragState = dragStateRef.current
    const startMinutes = minutesSinceStart(dragState.event.start)
    const endMinutes = minutesSinceStart(dragState.event.end)
    let nextStartMinutes = startMinutes
    let nextEndMinutes = endMinutes

    if (dragState.mode === 'move') {
      nextStartMinutes = pointerMinutes - dragState.grabOffsetMinutes
      nextStartMinutes = Math.max(
        0,
        Math.min(24 * 60 - dragState.durationMinutes, nextStartMinutes),
      )
      nextEndMinutes = nextStartMinutes + dragState.durationMinutes
    } else if (dragState.mode === 'resize-start') {
      nextStartMinutes = Math.max(
        0,
        Math.min(endMinutes - 5, pointerMinutes),
      )
      nextEndMinutes = endMinutes
    } else {
      nextStartMinutes = startMinutes
      nextEndMinutes = Math.min(24 * 60, Math.max(startMinutes + 5, pointerMinutes))
    }
    const dateStamp = targetGrid.dataset.dateTs
    const fallbackDayStart = dateStamp
      ? new Date(Number(dateStamp))
      : startOfDay(referenceDate)
    const targetDayStart =
      dragState.mode === 'move' ? fallbackDayStart : startOfDay(dragState.event.start)
    const nextStart = new Date(targetDayStart)
    nextStart.setMinutes(nextStartMinutes)
    const nextEnd = new Date(targetDayStart)
    nextEnd.setMinutes(nextEndMinutes)
    latestRangeRef.current = { start: nextStart, end: nextEnd }

    const left = rect.left - containerRect.left + FOCUS_LAYER_LEFT
    const width = Math.max(
      140,
      rect.width - FOCUS_LAYER_LEFT - FOCUS_LAYER_RIGHT,
    )
    const top =
      rect.top - containerRect.top + nextStartMinutes * PIXELS_PER_MINUTE
    const height = Math.max(
      24,
      (nextEndMinutes - nextStartMinutes) * PIXELS_PER_MINUTE,
    )

    const layer = dragLayerRef.current
    layer.style.display = 'block'
    layer.style.transform = `translate(${left}px, ${top}px)`
    layer.style.width = `${width}px`
    layer.style.height = `${height}px`
    if (dragLabelRef.current) {
      dragLabelRef.current.textContent = `${formatTime(nextStart)} - ${formatTime(
        nextEnd,
      )}`
    }
  }

  const scheduleDragUpdate = () => {
    if (rafRef.current) {
      return
    }
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null
      applyDragPosition()
    })
  }

  const handleEventDragStart = (payload: {
    event: CalendarEventWithDates
    grabOffsetMinutes: number
    durationMinutes: number
    clientX: number
    clientY: number
  }) => {
    dragStateRef.current = {
      event: payload.event,
      grabOffsetMinutes: payload.grabOffsetMinutes,
      durationMinutes: payload.durationMinutes,
      mode: 'move',
    }
    cancelDragRef.current = false
    lastPointerRef.current = { x: payload.clientX, y: payload.clientY }
    setDraggingEvent(payload.event)
    setDraggingEventId(payload.event.id)
    scheduleDragUpdate()
  }

  const handleEventResizeStart = (payload: {
    event: CalendarEventWithDates
    mode: 'start' | 'end'
    clientX: number
    clientY: number
  }) => {
    const startMinutes = minutesSinceStart(payload.event.start)
    const endMinutes = minutesSinceStart(payload.event.end)
    dragStateRef.current = {
      event: payload.event,
      grabOffsetMinutes: 0,
      durationMinutes: Math.max(5, endMinutes - startMinutes),
      mode: payload.mode === 'start' ? 'resize-start' : 'resize-end',
    }
    cancelDragRef.current = false
    lastPointerRef.current = { x: payload.clientX, y: payload.clientY }
    setDraggingEvent(payload.event)
    setDraggingEventId(payload.event.id)
    scheduleDragUpdate()
  }

  useEffect(() => {
    if (!draggingEventId) {
      return
    }

    const onMove = (event: PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      scheduleDragUpdate()
    }

    const onUp = () => {
      if (!cancelDragRef.current) {
        const latest = latestRangeRef.current
        if (latest && dragStateRef.current) {
          onUpdateEventTime(
            dragStateRef.current.event.id,
            latest.start,
            latest.end,
            true,
          )
        }
      }
      cancelDragRef.current = false
      dragStateRef.current = null
      latestRangeRef.current = null
      lastPointerRef.current = null
      setDraggingEvent(null)
      setDraggingEventId(null)
      if (dragLayerRef.current) {
        dragLayerRef.current.style.display = 'none'
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelDragRef.current = true
        onUp()
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp, { once: true })
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('keydown', onKeyDown)
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [draggingEventId, onUpdateEventTime, referenceDate])

  useLayoutEffect(() => {
    if (!draft) {
      setPanelStyle(undefined)
      return
    }

    const updatePanelPosition = () => {
      const safeEditingId =
        editingEventId &&
        (typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(editingEventId)
          : editingEventId.replace(/"/g, '\\"'))
      const anchor =
        safeEditingId && containerRef.current
          ? containerRef.current.querySelector<HTMLDivElement>(
              `[data-event-id="${safeEditingId}"] .event-card`,
            )
          : draftAnchorNode
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
  }, [draft, draftAnchorNode, editingEventId])

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
            onSelectEvent={handleSelectPreview}
            onToggleComplete={onToggleComplete}
            draft={draft}
            onDraftChange={(nextDraft) => {
              setDraft(nextDraft)
              if (nextDraft) {
                setSelectedId(null)
                setContextMenu(null)
              }
              if (nextDraft?.id.startsWith('draft-')) {
                setEditingEventId(null)
              }
            }}
            onDraftSelect={() => {
              setSelectedId(null)
              setContextMenu(null)
            }}
            popoverAlign={index >= days.length - 1 ? 'left' : 'right'}
            onClosePopover={() => setSelectedId(null)}
            onDraftLayout={setDraftAnchorNode}
            onEventDragStart={handleEventDragStart}
            onEventResizeStart={handleEventResizeStart}
            draggingEventId={draggingEventId}
            onEventEdit={handleStartEdit}
            onEventDelete={handleDeleteEvent}
            onEventContextMenu={(event, clientX, clientY) => {
              setSelectedId(null)
              setDraft(null)
              setEditingEventId(null)
              setContextMenu({ event, x: clientX, y: clientY })
            }}
          />
        ))}
      </div>
      {draggingEvent && (
        <div ref={dragLayerRef} className="drag-layer">
          <div
            className="drag-layer-card"
            style={
              draggingEvent.color
                ? ({ ['--event-bg' as string]: draggingEvent.color } as React.CSSProperties)
                : undefined
            }
          >
            <span className="drag-layer-title">
              {draggingEvent.title || 'Novo evento'}
            </span>
            <span ref={dragLabelRef} className="drag-layer-time" />
          </div>
        </div>
      )}
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
      {draft && (
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
            if (editingEventId) {
              await onEditEvent(editingEventId, draft)
            } else {
              await onCreateEvent(draft)
            }
            setDraft(null)
            setEditingEventId(null)
          }}
          mode={editingEventId ? 'edit' : 'create'}
          className={`floating panel-${panelSide}`}
          style={panelStyle}
          colors={colors}
        />
      )}
    </section>
  )
}
