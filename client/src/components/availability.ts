export const AVAILABILITY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
export const AVAILABILITY_HOURS = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
] as const

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
