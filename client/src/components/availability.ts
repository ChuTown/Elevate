export const AVAILABILITY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const START_MINUTES = 8 * 60
const END_MINUTES = 22 * 60
const STEP_MINUTES = 60

function formatMinutesLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const suffix = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export const AVAILABILITY_HOURS = Array.from(
  { length: (END_MINUTES - START_MINUTES) / STEP_MINUTES },
  (_, index) => formatMinutesLabel(START_MINUTES + index * STEP_MINUTES),
) as readonly string[]

export const AVAILABILITY_MAX_LEVEL = 1

export function createEmptyAvailability() {
  return AVAILABILITY_HOURS.map(() => AVAILABILITY_DAYS.map(() => 0))
}

export function normalizeAvailability(value: unknown) {
  const fallback = createEmptyAvailability()
  if (!Array.isArray(value)) {
    return fallback
  }

  return AVAILABILITY_HOURS.map((_, rowIndex) => {
    const row = value[rowIndex]
    if (!Array.isArray(row)) {
      return [...fallback[rowIndex]]
    }

    return AVAILABILITY_DAYS.map((_, colIndex) => {
      const raw = row[colIndex]
      const normalized = typeof raw === 'number' ? raw : 0
      if (!Number.isFinite(normalized)) {
        return 0
      }
      return Math.min(AVAILABILITY_MAX_LEVEL, Math.max(0, normalized > 0 ? 1 : 0))
    })
  })
}
