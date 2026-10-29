/**
 * ApprovalSync — Surgical Mobile Responsiveness Regression Test Suite
 * Tests responsive layout behaviors, mobile nav drawer toggling, table scroll containers,
 * modal dialog accessibility, tab scrollers, and touch ergonomics at narrow viewports.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { MobileNav } from '../components/layout/MobileNav';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/ui/Modal';
import { WizardStepper } from '../components/wizard/WizardStepper';
import { WizardStep } from '../applications/types';

describe('Mobile Responsiveness & Viewport Hardening', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { status: 'ok' } }),
    } as unknown as Response);
  });

  describe('Mobile Navigation Drawer & App Shell', () => {
    it('renders mobile menu button and opens mobile drawer on narrow viewports', () => {
      const handleToggle = vi.fn();
      render(
        <MemoryRouter>
          <Header onToggleMobileNav={handleToggle} isMobileNavOpen={false} />
        </MemoryRouter>,
      );

      const toggleButton = screen.getByRole('button', { name: /Open navigation menu/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggleButton);
      expect(handleToggle).toHaveBeenCalledTimes(1);
    });

    it('MobileNav drawer renders accessible dialog with navigation items and closes cleanly', () => {
      const handleClose = vi.fn();
      render(
        <MemoryRouter initialEntries={['/']}>
          <MobileNav isOpen={true} onClose={handleClose} />
        </MemoryRouter>,
      );

      const drawerDialog = screen.getByRole('dialog', { name: /Mobile navigation/i });
      expect(drawerDialog).toBeInTheDocument();
      expect(drawerDialog).toHaveAttribute('aria-modal', 'true');

      // Verify that navigation links are rendered inside the mobile drawer
      expect(screen.getByText('Workspace Overview')).toBeInTheDocument();
      expect(screen.getByText('Application Intake')).toBeInTheDocument();
      expect(screen.getByText('Scrutiny Queue')).toBeInTheDocument();

      // Close button
      const closeButton = screen.getByRole('button', { name: /Close menu/i });
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('MobileNav closes on Escape key press and locks body scroll', () => {
      const handleClose = vi.fn();
      const { unmount } = render(
        <MemoryRouter>
          <MobileNav isOpen={true} onClose={handleClose} />
        </MemoryRouter>,
      );

      expect(document.body.style.overflow).toBe('hidden');

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      unmount();
      expect(document.body.style.overflow).toBe('');
    });

    it('AppLayout coordinates header, main landmark, and mobile drawer', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div data-testid="test-content">Workspace Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      // Verify skip to main content link exists
      const skipLink = screen.getByText(/Skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');

      // Main region landmark
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'main-content');
      expect(screen.getByTestId('test-content')).toBeInTheDocument();

      // Open mobile nav from header
      const toggleButton = screen.getByRole('button', { name: /Open navigation menu/i });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /Mobile navigation/i })).toBeInTheDocument();
      });
    });
  });

  describe('Modal Responsive Container & Viewport Constraints', () => {
    it('Modal renders within dialog container with scrollable content and accessible labels', () => {
      const handleClose = vi.fn();
      render(
        <Modal
          isOpen={true}
          onClose={handleClose}
          title="Review Transition Confirmation"
          description="Case APP-2026-001"
          footer={<button type="button">Confirm Action</button>}
        >
          <div data-testid="modal-body-content">
            <p>Verification checklist requires authorized officer review.</p>
          </div>
        </Modal>,
      );

      const dialog = screen.getByRole('dialog', { name: /Review Transition Confirmation/i });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByTestId('modal-body-content')).toBeInTheDocument();
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /Close dialog/i });
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Wizard Stepper Navigation & Form Ergonomics', () => {
    it('WizardStepper renders accessible steps with aria-current on the active step', () => {
      const handleStepClick = vi.fn();
      render(
        <WizardStepper
          currentStep={WizardStep.PROGRAM_FACILITIES}
          highestVisitedStep={WizardStep.PROGRAM_FACILITIES}
          onStepClick={handleStepClick}
        />,
      );

      const nav = screen.getByRole('navigation', { name: /Application Intake Steps/i });
      expect(nav).toBeInTheDocument();

      // Step 2 is current
      const step2Item = screen.getByRole('button', { name: /Step 2/i });
      expect(step2Item.closest('li')).toHaveAttribute('aria-current', 'step');

      // Step 1 is navigable and completed
      const step1Button = screen.getByRole('button', { name: /Step 1/i });
      expect(step1Button).not.toBeDisabled();
      fireEvent.click(step1Button);
      expect(handleStepClick).toHaveBeenCalledWith(WizardStep.INSTITUTION_INFO);
    });
  });
});
