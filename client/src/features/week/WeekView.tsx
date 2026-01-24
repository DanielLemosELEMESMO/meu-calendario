import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { CalendarEvent, EventDraft } from '../../models/event'
import { withDates } from '../../models/event'
import EventCard from '../../components/EventCard'
import EventPopover from '../../components/EventPopover'
import EventFormPanel from '../../components/EventFormPanel'
import {
  addDays,
  formatDayLabel,
  isSameDay,
  minutesSinceStart,
  startOfDay,
} from '../../utils/dates'

const PIXELS_PER_MINUTE = 1.1
const DAY_HEIGHT = 24 * 60 * PIXELS_PER_MINUTE
const MIN_DURATION_MINUTES = 15
const ROUND_STEP = 15

type WeekViewProps = {
  events: CalendarEvent[]
  onToggleComplete: (eventId: string) => void
  referenceDate: Date
  onCreateEvent: (draft: EventDraft) => Promise<void>
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
                            className="event-wrap"
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
                          >
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
                          <div className="draft-card">
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
