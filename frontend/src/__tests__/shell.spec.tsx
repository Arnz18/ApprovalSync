import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { Footer } from '../components/layout/Footer';

describe('Application Shell Layout (FE-01)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { status: 'ok' } }),
    } as unknown as Response);
  });

  it('Header renders branding, prototype badge, and toggles mobile nav', async () => {
    const handleToggle = vi.fn();
    render(
      <MemoryRouter>
        <Header onToggleMobileNav={handleToggle} isMobileNavOpen={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/AICTE Workflow & Compliance Portal|NiyamSetu/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Regulation Bureau/i).length).toBeGreaterThan(0);

    const toggleBtn = screen.getByRole('button', { name: /Open navigation menu/i });
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });

  it('Sidebar renders categorized navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText('Workspace Overview')).toBeInTheDocument();
    expect(screen.getByText('Application Intake')).toBeInTheDocument();
    expect(screen.getByText('Scrutiny Queue')).toBeInTheDocument();
    expect(screen.getByText('Document AI & Checks')).toBeInTheDocument();
    expect(screen.getByText('APH Regulatory Rules')).toBeInTheDocument();
    expect(screen.getByText('Audit Ledger & Proofs')).toBeInTheDocument();
  });

  it('Footer renders decision-support disclaimer and regulatory environment notice', () => {
    render(<Footer />);

    expect(screen.getByText(/Institutional Decision-Support Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Institutional Sandbox/i)).toBeInTheDocument();
  });
});
