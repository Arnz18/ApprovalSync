import React from 'react';

export function Footer(): React.ReactElement {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-disclaimer">
          <p style={{ margin: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>NiyamSetu</span> —
            Approval &amp; Compliance Management System under AICTE Approval Process Handbook (APH)
            guidelines. Automated evaluations are advisory; final statutory determinations require
            authorized human review.
          </p>
        </div>
        <div
          className="footer-links"
          style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)' }}
        >
          <span>Institutional Sandbox</span>
          <span style={{ color: 'var(--color-border)' }}>•</span>
          <span>APH 2026 Norms</span>
        </div>
      </div>
    </footer>
  );
}
