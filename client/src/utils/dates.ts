export const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const endOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

export const addDays = (date: Date, amount: number): Date => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export const addMinutes = (date: Date, amount: number): Date => {
  const next = new Date(date)
  next.setMinutes(next.getMinutes() + amount)
  return next
}

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export const minutesSinceStart = (date: Date): number =>
  date.getHours() * 60 + date.getMinutes()

export const isNowWithin = (start: Date, end: Date): boolean => {
  const now = new Date()
  return now >= start && now <= end
}

export const formatDayLabel = (date: Date): string =>
  new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(date)

export const formatTimeRange = (start: Date, end: Date): string => {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${formatter.format(start)} - ${formatter.format(end)}`
}

export const formatDayNumber = (date: Date): string =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date)

export const formatMonthYear = (date: Date): string =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    date,
  )
