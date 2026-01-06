import type { CalendarEvent } from '../../models/event'
import { addDays, addMinutes, startOfDay } from '../../utils/dates'

const baseColors = ['#f97316', '#0ea5e9', '#22c55e', '#f43f5e']

export const createMockEvents = (): CalendarEvent[] => {
  const now = new Date()
  const today = startOfDay(now)
  const yesterday = startOfDay(addDays(now, -1))
  const tomorrow = startOfDay(addDays(now, 1))

  const build = (
    day: Date,
    offsetMinutes: number,
    durationMinutes: number,
    title: string,
    description: string,
    calendarId: string,
    color: string,
  ): CalendarEvent => {
    const start = addMinutes(day, offsetMinutes)
    const end = addMinutes(start, durationMinutes)
    return {
      id: `${calendarId}-${day.getTime()}-${offsetMinutes}`,
      title,
      description,
      start: start.toISOString(),
      end: end.toISOString(),
      calendarId,
      color,
      completed: false,
    }
  }

  return [
    build(
      yesterday,
      9 * 60,
      60,
      'Revisao do sprint',
      'Alinhar pendencias e prioridades com o time.',
      'work',
      baseColors[0],
    ),
    build(
      yesterday,
      14 * 60 + 30,
      45,
      'Acompanhamento com design',
      'Conferir fluxo de criacao de eventos e hierarquia visual.',
      'work',
      baseColors[1],
    ),
    build(
      today,
      8 * 60,
      45,
      'Rotina matinal',
      'Treino leve + revisao do dia.',
      'personal',
      baseColors[2],
    ),
    build(
      today,
      11 * 60,
      90,
      'Bloqueio de foco',
      'Implementar a visualizacao "Foco" e mock de dados.',
      'work',
      baseColors[0],
    ),
    build(
      today,
      16 * 60,
      60,
      'Atualizar backlog',
      'Organizar feedbacks e proximos testes.',
      'work',
      baseColors[1],
    ),
    build(
      tomorrow,
      9 * 60 + 15,
      45,
      'Sync com produto',
      'Discutir integracao futura com backend.',
      'work',
      baseColors[3],
    ),
    build(
      tomorrow,
      13 * 60,
      60,
      'Tempo pessoal',
      'Atividade de descanso e recarga.',
      'personal',
      baseColors[2],
    ),
    build(
      tomorrow,
      19 * 60,
      60,
      'Planejamento semanal',
      'Revisar metas e alinhar proximos passos.',
      'personal',
      baseColors[0],
    ),
  ]
}
