import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  Badge,
  SimulatedDataBadge,
  ApplicationStatusBadge,
  Alert,
  FormField,
  Input,
  Modal,
} from '../components/ui';

describe('Design System UI Components (FE-01)', () => {
  describe('Button', () => {
    it('renders with label and fires onClick', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Submit Dossier</Button>);

      const button = screen.getByRole('button', { name: /Submit Dossier/i });
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disables button and does not fire onClick when disabled=true', () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Submit Dossier
        </Button>,
      );

      const button = screen.getByRole('button', { name: /Submit Dossier/i });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('shows loading spinner and sets aria-busy when isLoading=true', () => {
      render(<Button isLoading>Processing</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });
  });

  describe('Badge', () => {
    it('renders basic badge with variant', () => {
      render(<Badge variant="success">Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders SimulatedDataBadge prominently', () => {
      render(<SimulatedDataBadge />);
      expect(screen.getByText(/SIMULATED \/ MOCK DATA/i)).toBeInTheDocument();
    });

    it('renders ApplicationStatusBadge with mapped label', () => {
      render(<ApplicationStatusBadge status="UNDER_SCRUTINY" />);
      expect(screen.getByText('Under Scrutiny')).toBeInTheDocument();
    });
  });

  describe('Alert', () => {
    it('renders alert with title and content', () => {
      render(
        <Alert variant="warning" title="Warning Header">
          Check regulatory parameters.
        </Alert>,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Warning Header')).toBeInTheDocument();
      expect(screen.getByText('Check regulatory parameters.')).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
      const handleClose = vi.fn();
      render(
        <Alert variant="info" onClose={handleClose}>
          Dismissable info
        </Alert>,
      );

      const closeBtn = screen.getByRole('button', { name: /Dismiss alert/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('FormField & Input', () => {
    it('links label with input id and associates error with aria-describedby', () => {
      render(
        <FormField
          id="land-area"
          label="Land Area (Acres)"
          required
          error="Land area must be greater than 0"
        >
          <Input defaultValue="0" />
        </FormField>,
      );

      const label = screen.getByText('Land Area (Acres)');
      expect(label).toBeInTheDocument();

      const input = screen.getByDisplayValue('0');
      expect(input).toHaveAttribute('id', 'land-area');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'land-area-error');

      const errorMsg = screen.getByRole('alert');
      expect(errorMsg).toHaveTextContent('Land area must be greater than 0');
    });
  });

  describe('Modal', () => {
    it('renders modal dialog when isOpen=true and closes on Escape key', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Regulatory Inspection Details">
          <p>Inspection content</p>
        </Modal>,
      );

      expect(
        screen.getByRole('dialog', { name: /Regulatory Inspection Details/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('Inspection content')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not render modal when isOpen=false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Closed Dialog">
          <p>Hidden</p>
        </Modal>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
