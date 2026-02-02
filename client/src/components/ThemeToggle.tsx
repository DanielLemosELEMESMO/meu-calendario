type ThemeToggleProps = {
  value: 'light' | 'dark'
  onChange: (next: 'light' | 'dark') => void
}

export default function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  return (
    <button
      type="button"
      className={`theme-toggle theme-${value}`}
      aria-pressed={value === 'dark'}
      onClick={() => onChange(value === 'dark' ? 'light' : 'dark')}
    >
      <span className="theme-toggle-icon theme-icon-sun" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.5M12 19v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.5 12h2.5M19 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
      </span>
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb" />
      </span>
      <span className="theme-toggle-icon theme-icon-moon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img">
          <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a7 7 0 1 0 11.5 11.5Z" />
        </svg>
      </span>
    </button>
  )
}
