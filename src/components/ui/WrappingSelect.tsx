import { useEffect, useMemo, useRef, useState } from 'react'
import { AutoComplete, type AutoCompleteCompleteEvent } from 'primereact/autocomplete'
import { Dropdown } from 'primereact/dropdown'

type Option = { value: string; label: string; selectedLabel?: string }

function optionSelectedLabel(option: Option) {
  return option.selectedLabel ?? option.label
}

function withNullFirst(options: Option[]) {
  const nullIndex = options.findIndex((option) => option.label === 'null' || option.value === '')
  if (nullIndex <= 0) return options
  const nullOption = options[nullIndex]
  return [nullOption, ...options.filter((_, index) => index !== nullIndex)]
}

function focusDropdownFilter() {
  const input = document.querySelector<HTMLInputElement>(
    '.p-dropdown-panel .p-dropdown-filter, .pr-dropdown-panel .p-dropdown-filter',
  )
  if (!input) return
  input.focus({ preventScroll: true })
  const len = input.value.length
  input.setSelectionRange?.(len, len)
}

function syncDropdownPanelWidth(trigger: HTMLElement | null | undefined) {
  if (!trigger) return

  const apply = () => {
    const width = `${Math.round(trigger.getBoundingClientRect().width)}px`
    document.querySelectorAll<HTMLElement>('.pr-dropdown-panel[data-pr-is-overlay="true"]').forEach((panel) => {
      panel.style.width = width
      panel.style.maxWidth = width
      panel.style.minWidth = width
    })
  }

  apply()
  requestAnimationFrame(apply)
}

export function WrappingSelect({
  name,
  required,
  defaultValue = '',
  value: controlledValue,
  onValueChange,
  placeholder,
  options,
  filter = false,
  disabled = false,
  emptyFilterAction,
  /** Type in the field itself; matching options show in the panel */
  editable = false,
}: {
  name: string
  required?: boolean
  defaultValue?: string | null
  value?: string | null
  onValueChange?: (value: string | null) => void
  placeholder: string
  options: Option[]
  filter?: boolean
  disabled?: boolean
  emptyFilterAction?: {
    label: string
    onAction: (query: string) => void
  }
  editable?: boolean
}) {
  const dropdownRef = useRef<Dropdown>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const orderedOptions = useMemo(() => withNullFirst(options), [options])
  const isControlled = controlledValue !== undefined
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue ?? null)
  const value = isControlled ? (controlledValue ?? null) : internalValue
  const [suggestions, setSuggestions] = useState<Option[]>(orderedOptions)
  const [typed, setTyped] = useState<Option | string | undefined>(undefined)

  function setValue(next: string | null) {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  useEffect(() => {
    if (!isControlled) setInternalValue(defaultValue ?? null)
  }, [defaultValue, isControlled])

  useEffect(() => {
    setSuggestions(withNullFirst(options))
  }, [options])

  useEffect(() => {
    setTyped(orderedOptions.find((option) => option.value === value))
  }, [value, orderedOptions])

  function selectedOption() {
    if (value === null || value === undefined) return undefined
    return orderedOptions.find((option) => option.value === value)
  }

  function completeMethod(event: AutoCompleteCompleteEvent) {
    const query = event.query.trim().toLowerCase()
    const filtered = query
      ? orderedOptions.filter((option) => option.label.toLowerCase().includes(query))
      : orderedOptions
    setSuggestions(withNullFirst(filtered))
  }

  if (editable) {
    return (
      <div className="pr-dropdown pr-autocomplete w-full" ref={wrapperRef}>
        <input type="hidden" name={name} value={value ?? ''} />
        <AutoComplete
          value={typed}
          suggestions={suggestions}
          completeMethod={completeMethod}
          field="label"
          dropdown
          forceSelection
          disabled={disabled}
          placeholder={placeholder}
          className="w-full"
          inputClassName="w-full"
          panelClassName="pr-dropdown-panel"
          delay={0}
          itemTemplate={(option: Option) => (
            <span className="block whitespace-normal break-words leading-snug">{option.label}</span>
          )}
          onChange={(e) => {
            if (disabled) return
            setTyped(e.value as Option | string | undefined)
            if (e.value && typeof e.value === 'object' && 'value' in e.value) {
              setValue((e.value as Option).value)
            } else if (!e.value) {
              setValue('')
            }
          }}
          onSelect={(e) => {
            if (disabled) return
            const option = e.value as Option
            setValue(option.value)
            setTyped(option)
          }}
          onClear={() => {
            if (disabled) return
            setValue('')
            setTyped(undefined)
          }}
          onFocus={() => {
            if (!typed || typeof typed === 'string') {
              setSuggestions(orderedOptions)
            }
          }}
          onShow={() => {
            syncDropdownPanelWidth(
              wrapperRef.current?.querySelector('.p-autocomplete') ?? wrapperRef.current,
            )
          }}
        />
      </div>
    )
  }

  return (
    <div className="pr-dropdown w-full" ref={wrapperRef}>
      <input type="hidden" name={name} value={value ?? ''} />
      <Dropdown
        ref={dropdownRef}
        value={value}
        onChange={(e) => {
          if (disabled) return
          const next = e.value
          setValue(next === null || next === undefined ? null : String(next))
        }}
        options={orderedOptions}
        optionLabel="label"
        optionValue="value"
        placeholder={placeholder}
        className="w-full"
        panelClassName="pr-dropdown-panel"
        required={required}
        disabled={disabled}
        filter={filter}
        filterBy={filter ? 'label' : undefined}
        filterPlaceholder={filter ? 'Type to filter…' : undefined}
        filterInputAutoFocus={filter}
        filterDelay={filter ? 0 : undefined}
        showClear={value !== null && value !== undefined && value !== '' && !disabled}
        resetFilterOnHide={filter}
        emptyFilterMessage={
          emptyFilterAction ? (
            <div className="space-y-2 py-1 text-center">
              <p className="text-sm text-slate-soft">No matches</p>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-md bg-teal px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal/90"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  dropdownRef.current?.hide()
                  emptyFilterAction.onAction(filterQuery.trim())
                  setFilterQuery('')
                }}
              >
                {emptyFilterAction.label}
              </button>
            </div>
          ) : (
            'No matches'
          )
        }
        transitionOptions={{ timeout: 0 }}
        onFilter={(e) => setFilterQuery(String(e.filter ?? ''))}
        onHide={() => setFilterQuery('')}
        onShow={() => {
          syncDropdownPanelWidth(dropdownRef.current?.getElement() ?? wrapperRef.current?.querySelector('.p-dropdown'))
          if (filter) {
            focusDropdownFilter()
            requestAnimationFrame(focusDropdownFilter)
          }
        }}
        itemTemplate={(option: Option) => (
          <span className="block whitespace-normal break-words leading-snug">{option.label}</span>
        )}
        valueTemplate={(option: Option | null) => {
          const resolved = option ?? selectedOption()
          return resolved ? (
            <span className="block truncate leading-snug">{optionSelectedLabel(resolved)}</span>
          ) : (
            placeholder
          )
        }}
      />
    </div>
  )
}
