type ViewOption<T extends string> = {
  id: T
  label: string
}

type ViewTabsProps<T extends string> = {
  options: ViewOption<T>[]
  value: T
  onChange: (value: T) => void
}

export default function ViewTabs<T extends string>({
  options,
  value,
  onChange,
}: ViewTabsProps<T>) {
  return (
    <div className="view-tabs">
      {options.map((option) => (
        <button
          key={option.id}
          className={value === option.id ? 'tab tab-active' : 'tab'}
          type="button"
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
