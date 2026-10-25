import React from 'react';

export function Footer(): React.ReactElement {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-disclaimer">
          <p style={{ margin: 0 }}>
            <strong>Institutional Decision-Support Prototype:</strong> ApprovalSync is developed for the Smart India Hackathon (SIH) under the AICTE Approval Automation domain. Automated document validation, OCR extraction, and anomaly flags are advisory and decision-support only. Final statutory approval, deficiency issuance, and rejection determinations require authorized human regulatory roles.
          </p>
        </div>
        <div className="footer-links">
          <span>Release: FE-01 Baseline</span>
          <span style={{ color: 'var(--color-border)' }}>•</span>
          <a
            href="/api/v1/health"
            target="_blank"
            rel="noopener noreferrer"
            title="Inspect backend health endpoint"
          >
            System Health (API)
          </a>
          <span style={{ color: 'var(--color-border)' }}>•</span>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            title="OpenAPI Specification"
          >
            OpenAPI Docs
          </a>
        </div>
      </div>
    </footer>
  );
}
