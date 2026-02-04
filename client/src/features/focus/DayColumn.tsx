import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import EventCard from '../../components/EventCard'
import EventPopover from '../../components/EventPopover'
import type { CalendarEventWithDates, EventDraft } from '../../models/event'
import {
  formatDayLabel,
  isSameDay,
  minutesSinceStart,
  addMinutes,
  startOfDay,
} from '../../utils/dates'

const PIXELS_PER_MINUTE = 1.1
const DAY_HEIGHT = 24 * 60 * PIXELS_PER_MINUTE
const MIN_DURATION_MINUTES = 15
const ROUND_STEP = 5

type DayColumnProps = {
  label: string
  date: Date
  events: CalendarEventWithDates[]
  highlightId: string | null
  selectedId: string | null
  onSelectEvent: (eventId: string | null) => void
  onToggleComplete: (eventId: string) => void
  draft: EventDraft | null
  onDraftChange: (draft: EventDraft | null) => void
  onDraftSelect: () => void
  onDraftLayout: (node: HTMLDivElement | null) => void
  onEventDragStart: (payload: {
    event: CalendarEventWithDates
    grabOffsetMinutes: number
    durationMinutes: number
    clientX: number
    clientY: number
  }) => void
  onEventResizeStart: (payload: {
    event: CalendarEventWithDates
    mode: 'start' | 'end'
    clientX: number
    clientY: number
  }) => void
  draggingEventId: string | null
  onEventEdit: (event: CalendarEventWithDates) => void
  onEventDelete: (eventId: string) => void
  onEventContextMenu: (
    event: CalendarEventWithDates,
    clientX: number,
    clientY: number,
  ) => void
  popoverAlign?: 'left' | 'right'
  onClosePopover: () => void
}

export default function DayColumn({
  label,
  date,
  events,
  highlightId,
  selectedId,
  onSelectEvent,
  onToggleComplete,
  draft,
  onDraftChange,
  onDraftSelect,
  onDraftLayout,
  onEventDragStart,
  onEventResizeStart,
  draggingEventId,
  onEventEdit,
  onEventDelete,
  onEventContextMenu,
  popoverAlign = 'right',
  onClosePopover,
}: DayColumnProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const dayStart = useMemo(() => startOfDay(date), [date])
  const isToday = isSameDay(date, new Date())
  const [resizeMode, setResizeMode] = useState<'start' | 'end' | null>(null)
  const draftRef = useRef<HTMLDivElement | null>(null)
  const [isDraftDragging, setIsDraftDragging] = useState(false)
  const draftDragRef = useRef<{
    grabOffsetMinutes: number
    durationMinutes: number
  } | null>(null)
  const pendingDragRef = useRef<{
    event: CalendarEventWithDates
    startX: number
    startY: number
    grabOffsetMinutes: number
    durationMinutes: number
  } | null>(null)
  const [isPendingDrag, setIsPendingDrag] = useState(false)
  const DRAG_START_THRESHOLD_PX = 6
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties | undefined>(
    undefined,
  )
  const popoverRafRef = useRef<number | null>(null)

  const eventsWithDates = useMemo(() => events, [events])

  useEffect(() => {
    if (!isToday || !scrollRef.current) {
      return
    }
    const nowMinutes = minutesSinceStart(new Date())
    const offset = nowMinutes * PIXELS_PER_MINUTE
    const container = scrollRef.current
    const target = Math.max(0, offset - container.clientHeight * 0.35)
    requestAnimationFrame(() => {
      container.scrollTop = target
    })
  }, [isToday])

  useEffect(() => {
    if (!draft || !isSameDay(draft.start, date)) {
      return
    }
    if (!draftRef.current) {
      return
    }
    onDraftLayout(draftRef.current)
  }, [draft, date, onDraftLayout])

  useEffect(() => {
    if (!resizeMode || !draft || !gridRef.current) {
      return
    }

    const previousSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const grid = gridRef.current
    const onMove = (event: PointerEvent) => {
      const rect = grid.getBoundingClientRect()
      const offsetY = Math.min(Math.max(0, event.clientY - rect.top), rect.height)
      const minutes = Math.round(offsetY / PIXELS_PER_MINUTE / ROUND_STEP) * ROUND_STEP
      const startMinutes = minutesSinceStart(draft.start)
      const endMinutes = minutesSinceStart(draft.end)
      if (resizeMode === 'start') {
        const nextStart = Math.min(
          Math.max(0, minutes),
          endMinutes - MIN_DURATION_MINUTES,
        )
        const next = new Date(dayStart)
        next.setMinutes(nextStart)
        onDraftChange({ ...draft, start: next })
      } else {
        const nextEnd = Math.max(
          Math.min(24 * 60, minutes),
          startMinutes + MIN_DURATION_MINUTES,
        )
        const next = new Date(dayStart)
        next.setMinutes(nextEnd)
        onDraftChange({ ...draft, end: next })
      }
    }

    const onUp = () => {
      document.body.style.userSelect = previousSelect
      setResizeMode(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [resizeMode, draft, dayStart, onDraftChange])

  useEffect(() => {
    if (!selectedId) {
      setPopoverStyle(undefined)
      return
    }

    const safeId =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(selectedId)
        : selectedId.replace(/"/g, '\\"')

    const updatePosition = () => {
      const anchor = document.querySelector<HTMLElement>(
        `[data-event-id="${safeId}"] .event-card`,
      )
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const gap = 12
      const fallbackWidth = 280
      const popover = document.querySelector<HTMLElement>(
        `[data-popover-for="${safeId}"]`,
      )
      const popoverRect = popover?.getBoundingClientRect()
      const width = popoverRect?.width ?? fallbackWidth
      const height = popoverRect?.height ?? 180
      const spaceRight = window.innerWidth - rect.right - gap
      const spaceLeft = rect.left - gap
      const preferRight = popoverAlign === 'right'
      const canRight = spaceRight >= width
      const canLeft = spaceLeft >= width
      const useRight = preferRight ? canRight || !canLeft : !canRight && canLeft ? false : canRight
      const rawLeft = useRight ? rect.right + gap : rect.left - gap - width
      const left = Math.max(12, Math.min(rawLeft, window.innerWidth - width - 12))
      const rawTop = rect.top
      const top = Math.max(12, Math.min(rawTop, window.innerHeight - height - 12))
      setPopoverStyle({
        position: 'fixed',
        left,
        top,
        width,
        maxHeight: window.innerHeight - 24,
        overflowY: 'auto',
      })
    }

    const scheduleUpdate = () => {
      if (popoverRafRef.current) return
      popoverRafRef.current = window.requestAnimationFrame(() => {
        popoverRafRef.current = null
        updatePosition()
      })
    }

    updatePosition()
    window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, true)
    const scrollNode = scrollRef.current
    scrollNode?.addEventListener('scroll', scheduleUpdate, { passive: true })
    return () => {
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate, true)
      scrollNode?.removeEventListener('scroll', scheduleUpdate)
      if (popoverRafRef.current) {
        window.cancelAnimationFrame(popoverRafRef.current)
        popoverRafRef.current = null
      }
    }
  }, [selectedId, popoverAlign])

  useEffect(() => {
    if (!isDraftDragging || !draft) {
      return
    }

    const previousSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const onMove = (event: PointerEvent) => {
      const grids = Array.from(
        document.querySelectorAll<HTMLElement>('.day-grid'),
      )
      const targetGrid =
        grids.find((item) => {
          const rect = item.getBoundingClientRect()
          return event.clientX >= rect.left && event.clientX <= rect.right
        }) ?? gridRef.current
      if (!targetGrid || !draftDragRef.current) return
      const rect = targetGrid.getBoundingClientRect()
      const offsetY = Math.min(Math.max(0, event.clientY - rect.top), rect.height)
      const pointerMinutes =
        Math.round(offsetY / PIXELS_PER_MINUTE / ROUND_STEP) * ROUND_STEP
      let nextStartMinutes =
        pointerMinutes - draftDragRef.current.grabOffsetMinutes
      nextStartMinutes = Math.max(
        0,
        Math.min(24 * 60 - draftDragRef.current.durationMinutes, nextStartMinutes),
      )
      const dateStamp = targetGrid.dataset.dateTs
      const targetDayStart = dateStamp
        ? new Date(Number(dateStamp))
        : dayStart
      const nextStart = new Date(targetDayStart)
      nextStart.setMinutes(nextStartMinutes)
      const nextEnd = addMinutes(nextStart, draftDragRef.current.durationMinutes)
      onDraftChange({ ...draft, start: nextStart, end: nextEnd })
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
  }, [dayStart, draft, isDraftDragging, onDraftChange])

  useEffect(() => {
    if (!isPendingDrag || !pendingDragRef.current) {
      return
    }

    const onMove = (event: PointerEvent) => {
      if (!pendingDragRef.current) return
      const { startX, startY, event: targetEvent, grabOffsetMinutes, durationMinutes } =
        pendingDragRef.current
      const deltaX = event.clientX - startX
      const deltaY = event.clientY - startY
      if (
        Math.hypot(deltaX, deltaY) < DRAG_START_THRESHOLD_PX
      ) {
        return
      }
      pendingDragRef.current = null
      setIsPendingDrag(false)
      onEventDragStart({
        event: targetEvent,
        grabOffsetMinutes,
        durationMinutes,
        clientX: event.clientX,
        clientY: event.clientY,
      })
    }

    const onUp = () => {
      pendingDragRef.current = null
      setIsPendingDrag(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [isPendingDrag, onEventDragStart])

  const handleGridPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (event.target instanceof HTMLElement) {
      if (event.target.closest('.event-wrap') || event.target.closest('.draft-event')) {
        return
      }
    }
    if (!gridRef.current) return
    const rect = gridRef.current.getBoundingClientRect()
    const offsetY = Math.min(Math.max(0, event.clientY - rect.top), rect.height)
    const minutes = Math.round(offsetY / PIXELS_PER_MINUTE / ROUND_STEP) * ROUND_STEP
    const start = new Date(dayStart)
    start.setMinutes(minutes)
    const end = new Date(dayStart)
    end.setMinutes(Math.min(24 * 60, minutes + 60))
    onDraftChange({
      id: `draft-${dayStart.getTime()}`,
      title: '',
      start,
      end,
    })
    onDraftSelect()
  }

  return (
    <section className="day-column">
      <header className="day-header">
        <span className="day-label">{label}</span>
        <span className="day-date">{formatDayLabel(date)}</span>
      </header>
      <div className="day-body" ref={scrollRef}>
        <div
          className="day-grid"
          data-date-ts={dayStart.getTime()}
          style={{ height: `${DAY_HEIGHT}px` }}
          onPointerDown={handleGridPointerDown}
          ref={gridRef}
        >
          {Array.from({ length: 24 }).map((_, hour) => (
            <div key={hour} className="hour-row">
              <span className="hour-label">{hour.toString().padStart(2, '0')}</span>
            </div>
          ))}
          {isToday && (
            <div
              className="now-line now-line-focus"
              style={{
                top: `${minutesSinceStart(new Date()) * PIXELS_PER_MINUTE}px`,
              }}
            />
          )}
          <div className="events-layer">
            {eventsWithDates.map((event) => {
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
              const isHighlighted = highlightId === event.id
              const isExpanded = selectedId === event.id
              return (
                <div
                  key={event.id}
                  className={[
                    'event-wrap',
                    isHighlighted ? 'event-pulse' : '',
                    isExpanded ? 'event-expanded-wrap' : '',
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
                    if (eventPointer.button !== 0) {
                      return
                    }
                    const target = eventPointer.target as HTMLElement | null
                    if (target?.closest('button')) {
                      return
                    }
                    eventPointer.stopPropagation()
                    eventPointer.preventDefault()
                    if (!gridRef.current) {
                      return
                    }
                    const gridRect = gridRef.current.getBoundingClientRect()
                    const pointerMinutes =
                      Math.round(
                        (eventPointer.clientY - gridRect.top) /
                          PIXELS_PER_MINUTE /
                          ROUND_STEP,
                      ) * ROUND_STEP
                    const grabOffsetMinutesRaw = pointerMinutes - startMinutes
                    const grabOffsetMinutes =
                      Math.round(grabOffsetMinutesRaw / ROUND_STEP) * ROUND_STEP
                    pendingDragRef.current = {
                      event,
                      startX: eventPointer.clientX,
                      startY: eventPointer.clientY,
                      grabOffsetMinutes,
                      durationMinutes,
                    }
                    setIsPendingDrag(true)
                  }}
                  onContextMenu={(eventContext) => {
                    eventContext.preventDefault()
                    eventContext.stopPropagation()
                    onEventContextMenu(event, eventContext.clientX, eventContext.clientY)
                  }}
                >
                  <div className="event-resize-handles">
                    <div
                      className="event-resize-handle event-resize-handle-top"
                      onPointerDown={(eventPointer) => {
                        eventPointer.stopPropagation()
                        eventPointer.preventDefault()
                        onEventResizeStart({
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
                        onEventResizeStart({
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
                    isExpanded={isExpanded}
                    onSelect={(eventId) =>
                      onSelectEvent(isExpanded ? null : eventId)
                    }
                    onToggleComplete={onToggleComplete}
                  />
                </div>
              )
            })}
            {draft && isSameDay(draft.start, date) && (
              <div
                className="event-wrap draft-event"
                ref={draftRef}
                style={
                  {
                    top: `${minutesSinceStart(draft.start) * PIXELS_PER_MINUTE}px`,
                    ['--event-height' as string]: `${
                      Math.max(
                        MIN_DURATION_MINUTES,
                        minutesSinceStart(draft.end) - minutesSinceStart(draft.start),
                      ) * PIXELS_PER_MINUTE
                    }px`,
                  } as CSSProperties
                }
                onClick={(eventClick) => {
                  eventClick.stopPropagation()
                  onDraftSelect()
                }}
              >
                <div
                  className={isDraftDragging ? 'draft-card draft-dragging' : 'draft-card'}
                  onPointerDown={(eventPointer) => {
                    const target = eventPointer.target as HTMLElement | null
                    if (target?.closest('.draft-handle')) {
                      return
                    }
                    eventPointer.stopPropagation()
                    eventPointer.preventDefault()
                    if (!gridRef.current) return
                    const gridRect = gridRef.current.getBoundingClientRect()
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
                      Math.round(grabOffsetMinutesRaw / ROUND_STEP) * ROUND_STEP
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
                      setResizeMode('start')
                    }}
                  />
                  <div
                    className="draft-handle draft-handle-bottom"
                    onPointerDown={(eventPointer) => {
                      eventPointer.stopPropagation()
                      eventPointer.preventDefault()
                      setResizeMode('end')
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedId &&
        popoverStyle &&
        typeof document !== 'undefined' &&
        (() => {
          const selectedEvent = eventsWithDates.find((item) => item.id === selectedId)
          if (!selectedEvent) return null
          return createPortal(
            <EventPopover
              event={selectedEvent}
              align={popoverAlign}
              onClose={onClosePopover}
              onEdit={() => onEventEdit(selectedEvent)}
              onDelete={onEventDelete}
              showActions
              className="event-popover-floating"
              style={popoverStyle}
              popoverFor={selectedId}
            />,
            document.body,
          )
        })()}
    </section>
  )
}
