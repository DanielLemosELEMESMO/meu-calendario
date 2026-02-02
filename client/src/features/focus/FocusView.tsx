import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import DayColumn from './DayColumn'
import type { CalendarEvent, CalendarEventWithDates, EventDraft } from '../../models/event'
import { withDates } from '../../models/event'
import { addDays, addMinutes, isSameDay, minutesSinceStart, startOfDay } from '../../utils/dates'
import EventFormPanel from '../../components/EventFormPanel'

const PIXELS_PER_MINUTE = 1.1
const ROUND_STEP = 5
const FOCUS_LAYER_LEFT = 36
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
}

export default function FocusView({
  events,
  onToggleComplete,
  referenceDate,
  onCreateEvent,
  onUpdateEventTime,
}: FocusViewProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EventDraft | null>(null)
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
      if (!target.closest(`[data-event-id="${safeId}"]`)) {
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
    if (!draft || !draftAnchorNode) {
      setPanelStyle(undefined)
      return
    }

    const updatePanelPosition = () => {
      const anchor = draftAnchorNode
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
  }, [draft, draftAnchorNode])

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
            popoverAlign={index >= days.length - 1 ? 'left' : 'right'}
            onClosePopover={() => setSelectedId(null)}
            onDraftLayout={setDraftAnchorNode}
            onEventDragStart={handleEventDragStart}
            onEventResizeStart={handleEventResizeStart}
            draggingEventId={draggingEventId}
          />
        ))}
      </div>
      {draggingEvent && (
        <div ref={dragLayerRef} className="drag-layer">
          <div className="drag-layer-card">
            <span className="drag-layer-title">
              {draggingEvent.title || 'Novo evento'}
            </span>
            <span ref={dragLabelRef} className="drag-layer-time" />
          </div>
        </div>
      )}
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
