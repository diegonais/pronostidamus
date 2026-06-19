import { useTheme } from '../context/ThemeContext';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 14.1A8 8 0 0 1 9.9 4a8.5 8.5 0 1 0 10.2 10.1Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === 'light' ? 'oscuro' : 'claro';
  const isLightTheme = theme === 'light';

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${nextThemeLabel}`}
      title={`Cambiar a modo ${nextThemeLabel}`}
    >
      <span className="theme-toggle-icon is-active" aria-hidden="true">
        {isLightTheme ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
}
