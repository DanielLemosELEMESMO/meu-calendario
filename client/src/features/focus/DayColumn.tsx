import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import EventCard from '../../components/EventCard'
import type { CalendarEvent, EventDraft } from '../../models/event'
import { withDates } from '../../models/event'
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
  events: CalendarEvent[]
  highlightId: string | null
  selectedId: string | null
  onSelectEvent: (eventId: string | null) => void
  onToggleComplete: (eventId: string) => void
  draft: EventDraft | null
  onDraftChange: (draft: EventDraft | null) => void
  onDraftSelect: () => void
  onDraftLayout: (rect: DOMRect | null) => void
  onEventTimeChange: (
    eventId: string,
    start: Date,
    end: Date,
    commit: boolean,
  ) => void
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
  onEventTimeChange,
}: DayColumnProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const dayStart = useMemo(() => startOfDay(date), [date])
  const isToday = isSameDay(date, new Date())
  const [resizeMode, setResizeMode] = useState<'start' | 'end' | null>(null)
  const draftRef = useRef<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [ghostEvent, setGhostEvent] = useState<{
    id: string
    start: Date
    end: Date
  } | null>(null)
  const [isDraftDragging, setIsDraftDragging] = useState(false)
  const draftDragRef = useRef<{
    grabOffsetMinutes: number
    durationMinutes: number
  } | null>(null)
  const dragStateRef = useRef<{
    id: string
    start: Date
    end: Date
    grabOffsetMinutes: number
    durationMinutes: number
  } | null>(null)
  const latestRangeRef = useRef<{ start: Date; end: Date } | null>(null)
  const cancelDragRef = useRef(false)

  const eventsWithDates = useMemo(
    () => events.map(withDates),
    [events],
  )

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
    if (!draftRef.current || !draft) {
      onDraftLayout(null)
      return
    }
    onDraftLayout(draftRef.current.getBoundingClientRect())
  }, [draft, onDraftLayout])

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
    if (!isDragging) {
      return
    }
    const dragState = dragStateRef.current
    if (!dragState || !gridRef.current) {
      return
    }

    const grid = gridRef.current
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
        }) ?? grid
      const rect = targetGrid.getBoundingClientRect()
      const offsetY = Math.min(Math.max(0, event.clientY - rect.top), rect.height)
      const pointerMinutes =
        Math.round(offsetY / PIXELS_PER_MINUTE / ROUND_STEP) * ROUND_STEP
      let nextStartMinutes = pointerMinutes - dragState.grabOffsetMinutes
      nextStartMinutes = Math.max(
        0,
        Math.min(24 * 60 - dragState.durationMinutes, nextStartMinutes),
      )
      const dateStamp = targetGrid.dataset.dateTs
      const targetDayStart = dateStamp
        ? new Date(Number(dateStamp))
        : dayStart
      const nextStart = new Date(targetDayStart)
      nextStart.setMinutes(nextStartMinutes)
      const nextEnd = addMinutes(nextStart, dragState.durationMinutes)
      latestRangeRef.current = { start: nextStart, end: nextEnd }
      onEventTimeChange(dragState.id, nextStart, nextEnd, false)
    }

    const onUp = () => {
      document.body.style.userSelect = previousSelect
      if (!cancelDragRef.current) {
        const latest = latestRangeRef.current
        if (latest) {
          onEventTimeChange(dragState.id, latest.start, latest.end, true)
        }
      }
      cancelDragRef.current = false
      setIsDragging(false)
      dragStateRef.current = null
      latestRangeRef.current = null
      setGhostEvent(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dayStart, isDragging, onEventTimeChange])

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
    if (!isDragging) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const dragState = dragStateRef.current
        if (!dragState) return
        cancelDragRef.current = true
        onEventTimeChange(dragState.id, dragState.start, dragState.end, false)
        setIsDragging(false)
        dragStateRef.current = null
        latestRangeRef.current = null
        setGhostEvent(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isDragging, onEventTimeChange])

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
              className="now-line"
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
                    const startMinutes = minutesSinceStart(event.start)
                    const endMinutes = minutesSinceStart(event.end)
                    const durationMinutes = endMinutes - startMinutes
                    const grabOffsetMinutesRaw = pointerMinutes - startMinutes
                    const grabOffsetMinutes =
                      Math.round(grabOffsetMinutesRaw / ROUND_STEP) * ROUND_STEP
                    dragStateRef.current = {
                      id: event.id,
                      start: event.start,
                      end: event.end,
                      grabOffsetMinutes,
                      durationMinutes,
                    }
                    latestRangeRef.current = { start: event.start, end: event.end }
                    cancelDragRef.current = false
                    setGhostEvent({
                      id: event.id,
                      start: event.start,
                      end: event.end,
                    })
                    setIsDragging(true)
                  }}
                >
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
            {ghostEvent && (
              <div
                className="event-wrap event-ghost"
                style={
                  {
                    top: `${minutesSinceStart(ghostEvent.start) * PIXELS_PER_MINUTE}px`,
                    ['--event-height' as string]: `${
                      Math.max(
                        24,
                        (minutesSinceStart(ghostEvent.end) -
                          minutesSinceStart(ghostEvent.start)) * PIXELS_PER_MINUTE,
                      )
                    }px`,
                  } as CSSProperties
                }
              >
                <div className="event-ghost-card" />
              </div>
            )}
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
    </section>
  )
}
