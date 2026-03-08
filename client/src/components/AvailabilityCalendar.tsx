import { useMemo, useState, type CSSProperties } from 'react'
import {
  AVAILABILITY_DAYS,
  AVAILABILITY_HOURS,
  AVAILABILITY_MAX_LEVEL,
  normalizeAvailability,
} from './availability'
import styles from './AvailabilityCalendar.module.css'

type AvailabilityCalendarProps = {
  value: number[][]
  onChange?: (nextValue: number[][]) => void
  readOnly?: boolean
  selectable?: boolean
  selectedCell?: { rowIndex: number; colIndex: number } | null
  onSelectCell?: (selection: { rowIndex: number; colIndex: number }) => void
}

function levelClass(level: number) {
  if (level <= 0) return styles.level0
  return styles.level1
}

function displayTimeLabel(hour: string) {
  return hour
}

export default function AvailabilityCalendar({
  value,
  onChange,
  readOnly = false,
  selectable = false,
  selectedCell = null,
  onSelectCell,
}: AvailabilityCalendarProps) {
  const normalizedValue = useMemo(() => normalizeAvailability(value), [value])
  const [isPainting, setIsPainting] = useState(false)
  const [paintLevel, setPaintLevel] = useState(0)

  function writeCell(rowIndex: number, colIndex: number, nextLevel: number) {
    if (readOnly || !onChange) return
    const next = normalizedValue.map((row) => [...row])
    next[rowIndex][colIndex] = nextLevel
    onChange(next)
  }

  function handleMouseDown(rowIndex: number, colIndex: number) {
    if (selectable) {
      const current = normalizedValue[rowIndex][colIndex]
      if (current > 0 && onSelectCell) {
        onSelectCell({ rowIndex, colIndex })
      }
      return
    }
    if (readOnly) return
    const current = normalizedValue[rowIndex][colIndex]
    const nextLevel = current >= AVAILABILITY_MAX_LEVEL ? 0 : AVAILABILITY_MAX_LEVEL
    setIsPainting(true)
    setPaintLevel(nextLevel)
    writeCell(rowIndex, colIndex, nextLevel)
  }

  function handleMouseEnter(rowIndex: number, colIndex: number) {
    if (!isPainting || readOnly) return
    writeCell(rowIndex, colIndex, paintLevel)
  }

  function stopPainting() {
    setIsPainting(false)
  }

  return (
    <div className={styles.wrapper} onMouseLeave={stopPainting}>
      <div className={styles.legend}>
        <span>Not Available</span>
        <div className={styles.legendScale} aria-hidden="true">
          {[0, 1].map((level) => (
            <span key={level} className={`${styles.legendSwatch} ${levelClass(level)}`} />
          ))}
        </div>
        <span>Available</span>
      </div>
      {!readOnly && !selectable && (
        <p className={styles.hint}>Click to toggle a slot. Drag to paint multiple slots.</p>
      )}
      {selectable && (
        <p className={styles.hint}>Click an available slot to select it for a scheduling request.</p>
      )}
      <div
        className={styles.calendar}
        style={{ '--availability-day-count': String(AVAILABILITY_DAYS.length) } as CSSProperties}
        role="grid"
        aria-label="Weekly availability calendar"
      >
        <div className={styles.corner} />
        {AVAILABILITY_DAYS.map((day) => (
          <div key={day} className={styles.headerCell} role="columnheader">
            {day}
          </div>
        ))}
        {AVAILABILITY_HOURS.map((hour, rowIndex) => (
          <div className={styles.row} key={hour}>
            <div
              className={`${styles.timeCell} ${
                rowIndex === AVAILABILITY_HOURS.length - 1 ? styles.lastRow : ''
              }`}
              role="rowheader"
            >
              {displayTimeLabel(hour)}
            </div>
            {AVAILABILITY_DAYS.map((day, colIndex) => {
              const cellLevel = normalizedValue[rowIndex][colIndex]
              return (
                <button
                  key={`${hour}-${day}`}
                  type="button"
                  role="gridcell"
                  className={`${styles.slot} ${levelClass(cellLevel)} ${
                    colIndex === AVAILABILITY_DAYS.length - 1 ? styles.lastColumn : ''
                  } ${rowIndex === AVAILABILITY_HOURS.length - 1 ? styles.lastRow : ''} ${
                    selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex
                      ? styles.selectedSlot
                      : ''
                  }`}
                  aria-label={`${day} ${hour} ${cellLevel ? 'available' : 'not available'}`}
                  onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                  onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                  onMouseUp={stopPainting}
                  onDragStart={(event) => event.preventDefault()}
                  disabled={readOnly || (selectable && cellLevel === 0)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
