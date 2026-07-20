'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5'
import classes from './StudioShell.module.css'

export type TerminalSelectOption<T extends string = string> = {
  value: T
  label: string
  meta?: string
}

type TerminalRowShellProps = {
  label: string
  value: ReactNode
  children: ReactNode
  onReset?: () => void
}

function TerminalRowShell({
  label,
  value,
  children,
  onReset,
}: TerminalRowShellProps) {
  return (
    <div className={classes.controlRow}>
      <span className={classes.controlLabel}>{label}</span>
      {children}
      <span className={classes.controlValue}>{value}</span>
      {onReset ? (
        <button
          type="button"
          className={classes.resetButton}
          onClick={onReset}
        >
          reset
        </button>
      ) : null}
    </div>
  )
}

export function TerminalRowGroup({
  title,
  action,
  children,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={classes.rowGroup}>
      {title && action ? (
        <div className={classes.groupHeader}>
          <h3 className={classes.groupTitle}>{title}</h3>
          {action}
        </div>
      ) : title ? (
        <h3 className={classes.groupTitle}>{title}</h3>
      ) : null}
      {children}
    </div>
  )
}

export function TerminalRangeRow({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
  onReset,
  allowOutOfRangeValue = false,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  displayValue?: string
  onChange: (value: number) => void
  onReset?: () => void
  allowOutOfRangeValue?: boolean
}) {
  const isOutOfRange = allowOutOfRangeValue && (value < min || value > max)
  const outOfRangePosition = (value - min) / (max - min) * 100

  return (
    <TerminalRowShell
      label={label}
      value={displayValue ?? formatNumber(value)}
      onReset={onReset}
    >
      <span className={classes.rangeInputShell}>
        <input
          aria-label={label}
          className={`${classes.rangeInput} ${isOutOfRange ? classes.rangeInputOutOfRange : ''}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
        {isOutOfRange ? (
          <span
            aria-hidden
            className={classes.rangeOutOfRangeThumb}
            style={{ left: `calc(${outOfRangePosition}% - 4px)` }}
          />
        ) : null}
      </span>
    </TerminalRowShell>
  )
}

export function TerminalSelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
  onReset,
}: {
  label: string
  value: T
  options: Array<TerminalSelectOption<T>>
  onChange: (value: T) => void
  onReset?: () => void
}) {
  return (
    <TerminalRowShell label={label} value="" onReset={onReset}>
      <select
        aria-label={label}
        className={classes.selectInput}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </TerminalRowShell>
  )
}

export function TerminalDropdownRow<T extends string>({
  label,
  value,
  options,
  onChange,
  onReset,
}: {
  label: string
  value: T
  options: Array<TerminalSelectOption<T>>
  onChange: (value: T) => void
  onReset?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <TerminalRowShell label={label} value="" onReset={onReset}>
      <div ref={rootRef} className={classes.dropdownControl}>
        <button
          type="button"
          className={classes.dropdownTrigger}
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((nextOpen) => !nextOpen)}
        >
          <span>{selectedOption?.label ?? value}</span>
          <span className={classes.dropdownChevron} aria-hidden>
            {open ? <IoChevronUpOutline /> : <IoChevronDownOutline />}
          </span>
        </button>
        {open ? (
          <div className={classes.dropdownMenu} role="listbox">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={classes.dropdownOption}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </TerminalRowShell>
  )
}

export function TerminalColorRow({
  label,
  value,
  onChange,
  onReset,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onReset?: () => void
}) {
  return (
    <TerminalRowShell label={label} value="" onReset={onReset}>
      <div className={classes.colorControl}>
        <input
          aria-label={`${label} color`}
          className={classes.colorSwatch}
          type="color"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <input
          aria-label={`${label} hex`}
          className={`${classes.textInput} ${classes.colorText}`}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </div>
    </TerminalRowShell>
  )
}

export function TerminalTextRow({
  label,
  value,
  placeholder,
  onChange,
  onReset,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
  onReset?: () => void
}) {
  return (
    <TerminalRowShell label={label} value="" onReset={onReset}>
      <input
        aria-label={label}
        className={classes.textInput}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </TerminalRowShell>
  )
}

export function TerminalToggleRow({
  label,
  checked,
  onChange,
  onReset,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  onReset?: () => void
}) {
  return (
    <TerminalRowShell label={label} value={checked ? 'ON' : 'OFF'} onReset={onReset}>
      <input
        aria-label={label}
        className={classes.toggleInput}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </TerminalRowShell>
  )
}

export function TerminalOptionGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<TerminalSelectOption<T>>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className={classes.optionGrid}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={classes.optionButton}
          data-active={option.value === value}
          onClick={() => onChange(option.value)}
        >
          <span className={classes.optionLabel}>{option.label}</span>
          {option.meta ? <span className={classes.optionMeta}>{option.meta}</span> : null}
        </button>
      ))}
    </div>
  )
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
}
