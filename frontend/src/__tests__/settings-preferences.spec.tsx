import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PreferencesProvider, usePreferences } from '../context/PreferencesContext';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { SettingsPage } from '../pages/SettingsPage';
import { AuthContext } from '../auth/AuthContext';
import { AuthContextValue } from '../auth/types';
import { UserRole } from '../api/types';

describe('Display Preferences & Settings Diagnostics (DEF-UI-06 & DEF-UI-07)', () => {
  const mockAuthValue: AuthContextValue = {
    user: {
      id: 'usr-inst-01',
      email: 'demo.institution@synthetic.approvalsync.local',
      name: 'Demo Institution Representative',
      role: UserRole.INSTITUTION_USER,
      institutionId: 'inst-01',
      isActive: true,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    status: 'AUTHENTICATED',
    isAuthenticated: true,
    isInitializing: false,
    initError: null,
    login: vi.fn(),
    logout: vi.fn(),
    retryInitialization: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-contrast');
    document.documentElement.removeAttribute('data-density');
    document.documentElement.className = '';
    vi.restoreAllMocks();
  });

  const TestPreferencesComponent = () => {
    const { highContrast, setHighContrast, density, setDensity } = usePreferences();
    return (
      <div>
        <span data-testid="contrast-val">{highContrast ? 'HIGH' : 'NORMAL'}</span>
        <span data-testid="density-val">{density}</span>
        <button onClick={() => setHighContrast(!highContrast)}>Toggle Contrast</button>
        <button onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}>
          Toggle Density
        </button>
      </div>
    );
  };

  it('PreferencesContext toggles high contrast, sets DOM attribute, and persists to localStorage', () => {
    render(
      <PreferencesProvider>
        <TestPreferencesComponent />
      </PreferencesProvider>,
    );

    expect(screen.getByTestId('contrast-val')).toHaveTextContent('NORMAL');
    expect(document.documentElement.getAttribute('data-contrast')).toBe('normal');
    expect(document.documentElement.classList.contains('high-contrast')).toBe(false);

    fireEvent.click(screen.getByText('Toggle Contrast'));

    expect(screen.getByTestId('contrast-val')).toHaveTextContent('HIGH');
    expect(document.documentElement.getAttribute('data-contrast')).toBe('high');
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    expect(localStorage.getItem('approvalsync_high_contrast')).toBe('true');

    // Toggle back
    fireEvent.click(screen.getByText('Toggle Contrast'));
    expect(screen.getByTestId('contrast-val')).toHaveTextContent('NORMAL');
    expect(document.documentElement.getAttribute('data-contrast')).toBe('normal');
    expect(localStorage.getItem('approvalsync_high_contrast')).toBe('false');
  });

  it('PreferencesContext switches density, sets DOM attribute, and persists to localStorage', () => {
    render(
      <PreferencesProvider>
        <TestPreferencesComponent />
      </PreferencesProvider>,
    );

    expect(screen.getByTestId('density-val')).toHaveTextContent('comfortable');
    expect(document.documentElement.getAttribute('data-density')).toBe('comfortable');

    fireEvent.click(screen.getByText('Toggle Density'));

    expect(screen.getByTestId('density-val')).toHaveTextContent('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    expect(document.documentElement.classList.contains('density-compact')).toBe(true);
    expect(localStorage.getItem('approvalsync_density')).toBe('compact');
  });

  it('SettingsPage renders clean user-facing environment without leaking raw ports to institution user', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/v1/health') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok' }),
        } as Response);
      }
      if (url === '/api/v1/health/readiness') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', info: { database: { status: 'up' } } }),
        } as Response);
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <PreferencesProvider>
            <SettingsPage />
          </PreferencesProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Platform Settings & Diagnostics')).toBeInTheDocument();
    expect(screen.getByText('Demo Institution Representative')).toBeInTheDocument();

    // Verify raw port 5434 and backend host are NOT leaked to institution user
    expect(screen.queryByText(/Port 5434/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/http:\/\/localhost:3000/i)).not.toBeInTheDocument();

    // Verify honest user-facing statuses render
    await waitFor(() => {
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    expect(screen.getByText(/Demonstration Sandbox/i)).toBeInTheDocument();
  });

  it('Test API Connection button performs real health check without fake math', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    } as Response);

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <PreferencesProvider>
            <SettingsPage />
          </PreferencesProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    const probeBtn = screen.getByRole('button', { name: /Test API connection latency/i });
    fireEvent.click(probeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Backend service operational \(HTTP 200\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Verified latency/i)).toBeInTheDocument();
    });
  });

  it('SettingsPage checkbox toggles high contrast and select adjusts density', () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <PreferencesProvider>
            <SettingsPage />
          </PreferencesProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    const checkbox = screen.getByLabelText(/High Contrast Text/i);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(document.documentElement.getAttribute('data-contrast')).toBe('high');

    const densitySelect = screen.getByLabelText(/Interface Density/i);
    expect(densitySelect).toHaveValue('comfortable');

    fireEvent.change(densitySelect, { target: { value: 'compact' } });
    expect(densitySelect).toHaveValue('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('ThemeToggle switches between light and dark themes, sets attributes, and persists to localStorage', () => {
    render(
      <PreferencesProvider>
        <ThemeToggle />
      </PreferencesProvider>,
    );

    const toggleBtn = screen.getByRole('switch');
    expect(toggleBtn).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Click to toggle to dark
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('niyamsetu_theme')).toBe('dark');

    // Toggle back via keyboard Enter
    fireEvent.keyDown(toggleBtn, { key: 'Enter' });
    expect(toggleBtn).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('niyamsetu_theme')).toBe('light');
  });
});
