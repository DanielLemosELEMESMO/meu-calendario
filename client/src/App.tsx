import { useEffect, useState } from 'react'
import FocusView from './features/focus/FocusView'
import MonthView from './features/month/MonthView'
import WeekView from './features/week/WeekView'
import ViewTabs from './components/ViewTabs'
import { eventRepository } from './data/repositories'
import type { CalendarEvent } from './models/event'
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

  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return

    const loadEvents = async () => {
      const now = referenceDate
      if (activeView === 'focus') {
        const start = startOfDay(addDays(now, -1))
        const end = endOfDay(addDays(now, 1))
        setEvents(await eventRepository.listRange(start, end))
        return
      }

      if (activeView === 'week') {
        const start = startOfDay(addDays(now, -now.getDay()))
        const end = endOfDay(addDays(start, 6))
        setEvents(await eventRepository.listRange(start, end))
        return
      }

      const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
      const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      setEvents(await eventRepository.listRange(start, end))
    }

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

  if (!isAuthenticated) {
    return (
      <div className="app app-login">
        <h1>MeuCalendario</h1>
        <p>Faça login para continuar</p>
        <a
          href="http://localhost:3001/auth/google"
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
        <ViewTabs
          options={views}
          value={activeView}
          onChange={setActiveView}
        />
      </header>
      <main className="app-main">
        {activeView === 'focus' && (
          <FocusView
            events={events}
            onToggleComplete={onToggleComplete}
            referenceDate={referenceDate}
          />
        )}
        {activeView === 'week' && (
          <WeekView
            events={events}
            onToggleComplete={onToggleComplete}
            referenceDate={referenceDate}
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
