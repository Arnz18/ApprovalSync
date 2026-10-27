import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';

const ThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test intentional render failure');
  }
  return <div>Healthy Child View Content</div>;
};

describe('ErrorBoundary Reliability & Recovery', () => {
  beforeEach(() => {
    // Suppress expected console.error during throwing test
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children normally when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Healthy Child View Content')).toBeInTheDocument();
  });

  it('catches render errors and renders accessible error fallback UI instead of blank white screen', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Unexpected Interface Error/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Test intentional render failure/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Reloading View/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go Back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
  });

  it('invokes onReset callback when Try Reloading View is clicked', () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Try Reloading View/i });
    fireEvent.click(retryBtn);

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
