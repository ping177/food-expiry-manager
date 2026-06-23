import { formatDateInput } from '../lib/expiry'

export default function DateInput({
  className,
  id,
  name,
  required = false,
  value,
  onChange,
}) {
  return (
    <input
      autoComplete="off"
      className={className}
      id={id}
      inputMode="numeric"
      maxLength={10}
      name={name}
      placeholder="YYYYMMDD"
      required={required}
      type="text"
      value={value}
      onChange={(event) => onChange(formatDateInput(event.target.value))}
    />
  )
}
