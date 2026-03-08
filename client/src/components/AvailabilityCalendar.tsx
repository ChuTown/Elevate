import { useMemo, useState } from 'react'
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
}

function levelClass(level: number) {
  if (level <= 0) return styles.level0
  return styles.level1
}

export default function AvailabilityCalendar({
  value,
  onChange,
  readOnly = false,
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
      {!readOnly && <p className={styles.hint}>Click to toggle a slot. Drag to paint multiple slots.</p>}
      <div className={styles.calendar} role="grid" aria-label="Weekly availability calendar">
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
              {hour}
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
                  } ${rowIndex === AVAILABILITY_HOURS.length - 1 ? styles.lastRow : ''}`}
                  aria-label={`${day} ${hour} ${cellLevel ? 'available' : 'not available'}`}
                  onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                  onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                  onMouseUp={stopPainting}
                  onDragStart={(event) => event.preventDefault()}
                  disabled={readOnly}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
