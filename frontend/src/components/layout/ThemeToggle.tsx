import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = usePreferences();
  const isDark = theme === 'dark';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleTheme();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Dark theme active — Switch to light' : 'Light theme active — Switch to dark'}
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      className={`theme-toggle-switch ${isDark ? 'theme-toggle-dark' : 'theme-toggle-light'} ${className}`}
    >
      <span className="theme-toggle-track">
        <Sun size={12} className="theme-toggle-icon sun-icon" aria-hidden="true" />
        <Moon size={12} className="theme-toggle-icon moon-icon" aria-hidden="true" />
        <span className="theme-toggle-thumb" aria-hidden="true">
          {isDark ? (
            <Moon size={10} className="thumb-icon" />
          ) : (
            <Sun size={10} className="thumb-icon" />
          )}
        </span>
      </span>
    </button>
  );
};
