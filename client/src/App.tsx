import { useEffect, useState } from 'react'
import FocusView from './features/focus/FocusView'
import MonthView from './features/month/MonthView'
import WeekView from './features/week/WeekView'
import ViewTabs from './components/ViewTabs'
import { eventRepository } from './data/repositories'
import type { CalendarEvent, EventDraft } from './models/event'
import { addDays, endOfDay, startOfDay } from './utils/dates'

type AppView = 'focus' | 'week' | 'month'

const views: { id: AppView; label: string }[] = [
  { id: 'focus', label: 'Foco' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
]

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('focus')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [referenceDate] = useState(() => new Date())

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const backendBaseUrl =
    import.meta.env.VITE_BACKEND_BASE_URL ?? 'http://localhost:3001'

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/me', { credentials: 'include' })
        setIsAuthenticated(response.ok)
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  const getRangeForView = (view: AppView, now: Date) => {
    if (view === 'focus') {
      return {
        start: startOfDay(addDays(now, -1)),
        end: endOfDay(addDays(now, 1)),
      }
    }
    if (view === 'week') {
      const start = startOfDay(addDays(now, -now.getDay()))
      return {
        start,
        end: endOfDay(addDays(start, 6)),
      }
    }
    return {
      start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    }
  }

  const loadEvents = async () => {
    if (!isAuthenticated) return
    try {
      setError(null)
      const range = getRangeForView(activeView, referenceDate)
      setEvents(await eventRepository.listRange(range.start, range.end))
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        setIsAuthenticated(false)
        return
      }
      setError('Nao foi possivel carregar eventos.')
    }
  }

  useEffect(() => {
    loadEvents()
  }, [activeView, referenceDate, isAuthenticated])

  const onToggleComplete = async (eventId: string) => {
    const updated = await eventRepository.toggleComplete(eventId)
    if (!updated) {
      return
    }
    setEvents((current) =>
      current.map((event) => (event.id === updated.id ? updated : event)),
    )
  }

  const onCreateEvent = async (draft: EventDraft) => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const toOffsetISOString = (date: Date) => {
      const pad = (value: number) => value.toString().padStart(2, '0')
      const year = date.getFullYear()
      const month = pad(date.getMonth() + 1)
      const day = pad(date.getDate())
      const hours = pad(date.getHours())
      const minutes = pad(date.getMinutes())
      const offsetMinutes = -date.getTimezoneOffset()
      const sign = offsetMinutes >= 0 ? '+' : '-'
      const absOffset = Math.abs(offsetMinutes)
      const offsetHours = pad(Math.floor(absOffset / 60))
      const offsetMins = pad(absOffset % 60)
      return `${year}-${month}-${day}T${hours}:${minutes}:00${sign}${offsetHours}:${offsetMins}`
    }
    await eventRepository.create({
      title: draft.title,
      description: draft.description,
      start: toOffsetISOString(draft.start),
      end: toOffsetISOString(draft.end),
      calendarId: draft.calendarId,
      timeZone,
    })
    await loadEvents()
  }

  const handleLogout = async () => {
    try {
      await fetch(`${backendBaseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      setIsAuthenticated(false)
      setEvents([])
    }
  }

  if (isAuthenticated === null) {
    return (
      <div className="app app-login">
        <h1>MeuCalendario</h1>
        <p>Verificando sessao...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="app app-login">
        <h1>MeuCalendario</h1>
        <p>Faca login para continuar</p>
        <a
          href={`${backendBaseUrl}/auth/google`}
          className="login-button"
        >
          Login com Google
        </a>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-name">MeuCalendario</span>
          <span className="brand-tagline">Organize o agora, simplifique o resto.</span>
        </div>
        <button className="logout-button" type="button" onClick={handleLogout}>
          Sair
        </button>
        <ViewTabs
          options={views}
          value={activeView}
          onChange={setActiveView}
        />
      </header>
      <main className="app-main">
        {error && <div className="app-error">{error}</div>}
        {activeView === 'focus' && (
          <FocusView
            events={events}
            onToggleComplete={onToggleComplete}
            referenceDate={referenceDate}
            onCreateEvent={onCreateEvent}
          />
        )}
        {activeView === 'week' && (
          <WeekView
            events={events}
            onToggleComplete={onToggleComplete}
            referenceDate={referenceDate}
            onCreateEvent={onCreateEvent}
          />
        )}
        {activeView === 'month' && (
          <MonthView
            events={events}
            onToggleComplete={onToggleComplete}
            referenceDate={referenceDate}
          />
        )}
      </main>
    </div>
  )
}
