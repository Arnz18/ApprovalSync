import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../routes/AppRoutes';
import { setStoredToken, clearStoredToken } from '../auth/sessionStorage';

describe('Routing & Navigation (FE-01 & FE-02)', () => {
  beforeEach(() => {
    // Authenticated admin session allows all routes to be reached
    setStoredToken('mock-admin-token');
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('/auth/me')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              success: true,
              data: {
                id: 'mock-admin-id',
                email: 'demo.admin@synthetic.approvalsync.local',
                name: 'Demo Administrator',
                role: 'SYSTEM_ADMIN',
                isActive: true,
                createdAt: '2026-10-25T00:00:00.000Z',
              },
            }),
        } as unknown as Response;
      }
      if (String(url).includes('/applications')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              success: true,
              data: {
                items: [],
                pagination: { totalItems: 0, totalPages: 1, currentPage: 1, limit: 10 },
              },
            }),
        } as unknown as Response;
      }
      // Health probe
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: { status: 'ok' } }),
      } as unknown as Response;
    });
  });

  afterEach(() => {
    clearStoredToken();
  });

  it('renders HomePage on initial root route ("/")', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', { name: /Institutional Regulatory Workspace/i }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Core Regulatory Modules/i)).toBeInTheDocument();
        expect(screen.getByText('API Online')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('renders ApplicationWizardPage for "/applications" (FE-03)', async () => {
    render(
      <MemoryRouter initialEntries={['/applications']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Institution Application Intake Wizard/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Statutory accreditation & regulatory approval intake workflow/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Step 1: Institution & Program/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });

  it('renders ScrutinyQueuePage for "/scrutiny" (FE-04)', async () => {
    render(
      <MemoryRouter initialEntries={['/scrutiny']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Scrutiny Review Queue/i })).toBeInTheDocument();
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });

  it('renders EvcQueuePage for "/evc" (FE-06)', async () => {
    render(
      <MemoryRouter initialEntries={['/evc']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /EVC Inspection & Committee Queue/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });

  it('renders FeaturePlaceholderPage for "/verification" explaining DOC-04', async () => {
    render(
      <MemoryRouter initialEntries={['/verification']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Document AI & Duplicate Detection Engine/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Chunk DOC-04 — COMMITTED/i)).toBeInTheDocument();
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });

  it('renders NotFoundPage on unknown route', async () => {
    render(
      <MemoryRouter initialEntries={['/invalid-nonexistent-route-xyz']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /404 — Regulatory Route Not Found/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /Return to Workspace Overview/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated users attempting to access protected route to /login', async () => {
    // Clear token to simulate unauthenticated visitor
    clearStoredToken();

    render(
      <MemoryRouter initialEntries={['/applications']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    // Should redirect to LoginPage
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Institutional Sign In/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Official Email Address/i)).toBeInTheDocument();
    });
  });

  it('renders AccessDeniedPage when authenticated user has insufficient role clearance', async () => {
    // Override fetch to return an INSTITUTION_USER who is NOT permitted on /audit
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('/auth/me')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              success: true,
              data: {
                id: 'mock-inst-id',
                email: 'demo.institution@synthetic.approvalsync.local',
                name: 'Demo Institution Representative',
                role: 'INSTITUTION_USER',
                isActive: true,
                createdAt: '2026-10-25T00:00:00.000Z',
              },
            }),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: { status: 'ok' } }),
      } as unknown as Response;
    });

    render(
      <MemoryRouter initialEntries={['/audit']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Access Restricted/i })).toBeInTheDocument();
      expect(screen.getByText(/HTTP 403 Forbidden/i)).toBeInTheDocument();
      expect(screen.getByText(/Return to Designated Workspace/i)).toBeInTheDocument();
    });
  });
});
