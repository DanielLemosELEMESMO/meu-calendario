import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { CalendarEvent, CalendarEventWithDates, EventDraft } from '../../models/event'
import { withDates } from '../../models/event'
import EventCard from '../../components/EventCard'
import EventPopover from '../../components/EventPopover'
import EventFormPanel from '../../components/EventFormPanel'
import {
  addDays,
  addMinutes,
  formatDayLabel,
  isSameDay,
  minutesSinceStart,
  startOfDay,
} from '../../utils/dates'

const PIXELS_PER_MINUTE = 1.1
const DAY_HEIGHT = 24 * 60 * PIXELS_PER_MINUTE
const MIN_DURATION_MINUTES = 15
const ROUND_STEP = 5
const WEEK_LAYER_LEFT = 8
const WEEK_LAYER_RIGHT = 6

type WeekViewProps = {
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

type ResizeState = {
  mode: 'start' | 'end'
  dayStart: Date
  grid: HTMLDivElement
}

export default function WeekView({
  events,
  onToggleComplete,
  referenceDate,
  onCreateEvent,
  onUpdateEventTime,
}: WeekViewProps) {
  const start = startOfDay(addDays(referenceDate, -referenceDate.getDay()))
  const days = Array.from({ length: 7 }).map((_, index) => addDays(start, index))
  const eventDates = useMemo(() => events.map(withDates), [events])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const resizeStateRef = useRef<ResizeState | null>(null)
  const [resizeMode, setResizeMode] = useState<'start' | 'end' | null>(null)
  const gridRefs = useRef(new Map<string, HTMLDivElement>())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const draftRef = useRef<HTMLDivElement | null>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | undefined>(
    undefined,
  )
  const [panelSide, setPanelSide] = useState<'left' | 'right'>('right')
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
  const [isDraftDragging, setIsDraftDragging] = useState(false)
  const draftDragRef = useRef<{
    grabOffsetMinutes: number
    durationMinutes: number
  } | null>(null)

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
      if (!target.closest(`[data-event-id="${safeId}"]`)) {
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
    if (!resizeMode || !draft || !resizeStateRef.current) {
      return
    }

    const { dayStart, grid, mode } = resizeStateRef.current
    const previousSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const onMove = (event: PointerEvent) => {
      const rect = grid.getBoundingClientRect()
      const offsetY = Math.min(Math.max(0, event.clientY - rect.top), rect.height)
      const minutes = Math.round(offsetY / PIXELS_PER_MINUTE / ROUND_STEP) * ROUND_STEP
      const startMinutes = minutesSinceStart(draft.start)
      const endMinutes = minutesSinceStart(draft.end)

      if (mode === 'start') {
        const nextStart = Math.min(
          Math.max(0, minutes),
          endMinutes - MIN_DURATION_MINUTES,
        )
        const next = new Date(dayStart)
        next.setMinutes(nextStart)
        setDraft({ ...draft, start: next })
      } else {
        const nextEnd = Math.max(
          Math.min(24 * 60, minutes),
          startMinutes + MIN_DURATION_MINUTES,
        )
        const next = new Date(dayStart)
        next.setMinutes(nextEnd)
        setDraft({ ...draft, end: next })
      }
    }

    const onUp = () => {
      document.body.style.userSelect = previousSelect
      setResizeMode(null)
      resizeStateRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [resizeMode, draft])

  useEffect(() => {
    if (!isDraftDragging || !draft) {
      return
    }

    const previousSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const onMove = (event: PointerEvent) => {
      const grids = Array.from(
        document.querySelectorAll<HTMLElement>('.week-day-grid'),
      )
      const grid =
        grids.find((item) => {
          const rect = item.getBoundingClientRect()
          return event.clientX >= rect.left && event.clientX <= rect.right
        }) ?? grids[0]
      if (!grid || !draftDragRef.current) return
      const rect = grid.getBoundingClientRect()
      const offsetY = Math.min(Math.max(0, event.clientY - rect.top), rect.height)
      const pointerMinutes =
        Math.round(offsetY / PIXELS_PER_MINUTE / ROUND_STEP) * ROUND_STEP
      let nextStartMinutes =
        pointerMinutes - draftDragRef.current.grabOffsetMinutes
      nextStartMinutes = Math.max(
        0,
        Math.min(24 * 60 - draftDragRef.current.durationMinutes, nextStartMinutes),
      )
      const dateStamp = grid.dataset.dateTs
      const targetDayStart = dateStamp
        ? new Date(Number(dateStamp))
        : startOfDay(referenceDate)
      const nextStart = new Date(targetDayStart)
      nextStart.setMinutes(nextStartMinutes)
      const nextEnd = addMinutes(nextStart, draftDragRef.current.durationMinutes)
      setDraft({ ...draft, start: nextStart, end: nextEnd })
    }

    const onUp = () => {
      document.body.style.userSelect = previousSelect
      setIsDraftDragging(false)
      draftDragRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draft, isDraftDragging, referenceDate])

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

  const applyDragPosition = () => {
    if (!containerRef.current || !dragLayerRef.current || !dragStateRef.current) {
      return
    }
    if (!lastPointerRef.current) {
      return
    }
    const { x, y } = lastPointerRef.current
    const grids = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.week-day-grid'),
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

    const left = rect.left - containerRect.left + WEEK_LAYER_LEFT
    const width = Math.max(
      120,
      rect.width - WEEK_LAYER_LEFT - WEEK_LAYER_RIGHT,
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

  useEffect(() => {
    if (!draftRef.current || !draft || !containerRef.current) {
      setPanelStyle(undefined)
      return
    }
    const rect = draftRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    const gap = 16
    const width = 280
    const availableRight = containerRect.right - rect.right
    const availableLeft = rect.left - containerRect.left
    const useRight = availableRight >= width + gap || availableRight >= availableLeft
    const left = useRight
      ? rect.right - containerRect.left + gap
      : rect.left - containerRect.left - width - gap
    const top = Math.max(0, rect.top - containerRect.top)
    setPanelSide(useRight ? 'right' : 'left')
    setPanelStyle({ left, top, width })
  }, [draft])

  const handleGridPointerDown = (
    day: Date,
    grid: HTMLDivElement | null,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.stopPropagation()
    if (!grid) return
    if (event.target instanceof HTMLElement) {
      if (event.target.closest('.event-wrap') || event.target.closest('.draft-event')) {
        return
      }
    }
    const rect = grid.getBoundingClientRect()
    const offsetY = Math.min(Math.max(0, event.clientY - rect.top), rect.height)
    const minutes = Math.round(offsetY / PIXELS_PER_MINUTE / ROUND_STEP) * ROUND_STEP
    const startTime = new Date(day)
    startTime.setMinutes(minutes)
    const endTime = new Date(day)
    endTime.setMinutes(Math.min(24 * 60, minutes + 60))
    setDraft({
      id: `draft-${day.getTime()}`,
      title: '',
      start: startTime,
      end: endTime,
    })
    setSelectedId(null)
  }

  return (
    <section className="view-with-panel view-floating" ref={containerRef}>
      <div className="week-view week-grid-view">
        <header className="week-header">
          <h2>Semana em movimento</h2>
          <p>Uma visao panoramica para equilibrar foco e ritmo.</p>
        </header>
        <div className="week-grid">
          <div className="week-time-column">
            {Array.from({ length: 24 }).map((_, hour) => (
              <div key={hour} className="week-time-slot">
                <span className="week-time-label">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
          <div className="week-days">
            {days.map((day, dayIndex) => {
              const dayEvents = eventDates.filter((event) =>
                isSameDay(event.start, day),
              )
              const align = dayIndex > 3 ? 'left' : 'right'
              const dayKey = day.toDateString()
              const gridRef = (node: HTMLDivElement | null) => {
                if (!node) return
                gridRefs.current.set(dayKey, node)
              }
              return (
                <div key={day.toISOString()} className="week-day">
                  <div className="week-day-header">{formatDayLabel(day)}</div>
                  <div
                    className="week-day-grid"
                    data-date-ts={startOfDay(day).getTime()}
                    style={{ height: `${DAY_HEIGHT}px` }}
                    ref={gridRef}
                    onPointerDown={(event) =>
                      handleGridPointerDown(
                        day,
                        gridRefs.current.get(dayKey) ?? event.currentTarget,
                        event,
                      )
                    }
                  >
                    <div className="events-layer">
                      {dayEvents.map((event) => {
                        const startMinutes = minutesSinceStart(event.start)
                        const endMinutes = minutesSinceStart(event.end)
                        const top = startMinutes * PIXELS_PER_MINUTE
                        const durationMinutes = Math.max(0, endMinutes - startMinutes)
                        const height = Math.max(24, durationMinutes * PIXELS_PER_MINUTE)
                        const density =
                          durationMinutes < 20
                            ? 'short'
                            : durationMinutes < 45
                              ? 'medium'
                              : 'long'
                        return (
                          <div
                            key={event.id}
                            className={[
                              'event-wrap',
                              draggingEventId === event.id ? 'event-dragging' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            data-event-id={event.id}
                            style={
                              {
                                top: `${top}px`,
                                ['--event-height' as string]: `${height}px`,
                                ['--event-expanded-height' as string]: `${Math.max(
                                  height,
                                  120,
                                )}px`,
                              } as CSSProperties
                            }
                            onPointerDown={(eventPointer) => {
                              const target = eventPointer.target as HTMLElement | null
                              if (target?.closest('button')) {
                                return
                              }
                              eventPointer.stopPropagation()
                              eventPointer.preventDefault()
                              const grid = gridRefs.current.get(dayKey)
                              if (!grid) return
                              const gridRect = grid.getBoundingClientRect()
                              const pointerMinutes =
                                Math.round(
                                  (eventPointer.clientY - gridRect.top) /
                                    PIXELS_PER_MINUTE /
                                    ROUND_STEP,
                                ) * ROUND_STEP
                              const startMinutes = minutesSinceStart(event.start)
                              const endMinutes = minutesSinceStart(event.end)
                              const durationMinutes = endMinutes - startMinutes
                              const grabOffsetMinutesRaw =
                                pointerMinutes - startMinutes
                              const grabOffsetMinutes =
                                Math.round(grabOffsetMinutesRaw / ROUND_STEP) *
                                ROUND_STEP
                              handleEventDragStart({
                                event,
                                grabOffsetMinutes,
                                durationMinutes,
                                clientX: eventPointer.clientX,
                                clientY: eventPointer.clientY,
                              })
                            }}
                          >
                            <div className="event-resize-handles">
                              <div
                                className="event-resize-handle event-resize-handle-top"
                                onPointerDown={(eventPointer) => {
                                  eventPointer.stopPropagation()
                                  eventPointer.preventDefault()
                                  handleEventResizeStart({
                                    event,
                                    mode: 'start',
                                    clientX: eventPointer.clientX,
                                    clientY: eventPointer.clientY,
                                  })
                                }}
                              />
                              <div
                                className="event-resize-handle event-resize-handle-bottom"
                                onPointerDown={(eventPointer) => {
                                  eventPointer.stopPropagation()
                                  eventPointer.preventDefault()
                                  handleEventResizeStart({
                                    event,
                                    mode: 'end',
                                    clientX: eventPointer.clientX,
                                    clientY: eventPointer.clientY,
                                  })
                                }}
                              />
                            </div>
                            <EventCard
                              event={event}
                              density={density}
                              isExpanded={selectedId === event.id}
                              onSelect={(eventId) =>
                                setSelectedId((current) => {
                                  if (closeTimerRef.current) {
                                    window.clearTimeout(closeTimerRef.current)
                                    closeTimerRef.current = null
                                  }
                                  setClosingId(null)
                                  return current === eventId ? null : eventId
                                })
                              }
                              onToggleComplete={onToggleComplete}
                            />
                            {selectedId === event.id && (
                              <EventPopover
                                event={event}
                                align={align}
                                isClosing={closingId === event.id}
                                onClose={requestClose}
                                onToggleComplete={onToggleComplete}
                              />
                            )}
                          </div>
                        )
                      })}
                      {draft && isSameDay(draft.start, day) && (
                        <div
                          className="event-wrap draft-event"
                          ref={draftRef}
                          style={
                            {
                              top: `${
                                minutesSinceStart(draft.start) * PIXELS_PER_MINUTE
                              }px`,
                              ['--event-height' as string]: `${
                                Math.max(
                                  MIN_DURATION_MINUTES,
                                  minutesSinceStart(draft.end) -
                                    minutesSinceStart(draft.start),
                                ) * PIXELS_PER_MINUTE
                              }px`,
                            } as CSSProperties
                          }
                          onClick={(eventClick) => {
                            eventClick.stopPropagation()
                            setSelectedId(null)
                          }}
                        >
                          <div
                            className={
                              isDraftDragging ? 'draft-card draft-dragging' : 'draft-card'
                            }
                            onPointerDown={(eventPointer) => {
                              const target = eventPointer.target as HTMLElement | null
                              if (target?.closest('.draft-handle')) {
                                return
                              }
                              eventPointer.stopPropagation()
                              eventPointer.preventDefault()
                              const grid = gridRefs.current.get(dayKey)
                              if (!grid) return
                              const gridRect = grid.getBoundingClientRect()
                              const pointerMinutes =
                                Math.round(
                                  (eventPointer.clientY - gridRect.top) /
                                    PIXELS_PER_MINUTE /
                                    ROUND_STEP,
                                ) * ROUND_STEP
                              const startMinutes = minutesSinceStart(draft.start)
                              const endMinutes = minutesSinceStart(draft.end)
                              const durationMinutes = endMinutes - startMinutes
                              const grabOffsetMinutesRaw =
                                pointerMinutes - startMinutes
                              const grabOffsetMinutes =
                                Math.round(grabOffsetMinutesRaw / ROUND_STEP) *
                                ROUND_STEP
                              draftDragRef.current = {
                                grabOffsetMinutes,
                                durationMinutes,
                              }
                              setIsDraftDragging(true)
                            }}
                          >
                            <span>{draft.title || 'Novo evento'}</span>
                            <div
                              className="draft-handle draft-handle-top"
                              onPointerDown={(eventPointer) => {
                                eventPointer.stopPropagation()
                                eventPointer.preventDefault()
                                const grid = gridRefs.current.get(dayKey)
                                if (!grid) return
                                resizeStateRef.current = {
                                  mode: 'start',
                                  dayStart: startOfDay(day),
                                  grid,
                                }
                                setResizeMode('start')
                              }}
                            />
                            <div
                              className="draft-handle draft-handle-bottom"
                              onPointerDown={(eventPointer) => {
                                eventPointer.stopPropagation()
                                eventPointer.preventDefault()
                                const grid = gridRefs.current.get(dayKey)
                                if (!grid) return
                                resizeStateRef.current = {
                                  mode: 'end',
                                  dayStart: startOfDay(day),
                                  grid,
                                }
                                setResizeMode('end')
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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
