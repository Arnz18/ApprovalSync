import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../routes/AppRoutes';

describe('Routing & Navigation (FE-01)', () => {
  beforeEach(() => {
    // Mock global fetch for health check
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { status: 'ok' } }),
    } as unknown as Response);
  });

  it('renders HomePage on initial root route ("/")', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Institutional Regulatory Workspace/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Core Regulatory Modules/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });

  it('renders FeaturePlaceholderPage for "/applications" explaining FE-03', async () => {
    render(
      <MemoryRouter initialEntries={['/applications']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Application Intake & Wizard/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Chunk FE-03 — BLOCKED/i)).toBeInTheDocument();
    expect(screen.getByText(/Prerequisite Dependency Gates:/i)).toBeInTheDocument();
    expect(screen.getByText(/FE-02/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });

  it('renders FeaturePlaceholderPage for "/scrutiny" explaining FE-04', async () => {
    render(
      <MemoryRouter initialEntries={['/scrutiny']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Scrutiny Officer Review Queue/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Chunk FE-04 — BLOCKED/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });

  it('renders FeaturePlaceholderPage for "/verification" explaining DOC-04', async () => {
    render(
      <MemoryRouter initialEntries={['/verification']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Document AI & Duplicate Detection Engine/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Chunk DOC-04 — COMMITTED/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });

  it('renders NotFoundPage on unknown route', async () => {
    render(
      <MemoryRouter initialEntries={['/invalid-nonexistent-route-xyz']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /404 — Regulatory Route Not Found/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to Workspace Overview/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });
});
