import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  ShieldCheck,
  MapPin,
  BookOpen,
  History,
  Settings,
  HelpCircle,
} from 'lucide-react';

export interface NavItemConfig {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'default' | 'primary' | 'warning';
}

export const NAV_ITEMS: { section: string; items: NavItemConfig[] }[] = [
  {
    section: 'Workspace',
    items: [
      {
        path: '/',
        label: 'Workspace Overview',
        icon: <LayoutDashboard className="nav-item-icon" aria-hidden="true" />,
      },
      {
        path: '/applications',
        label: 'Application Intake',
        icon: <FileText className="nav-item-icon" aria-hidden="true" />,
        badge: 'FE-03',
      },
    ],
  },
  {
    section: 'Regulatory Review',
    items: [
      {
        path: '/scrutiny',
        label: 'Scrutiny Queue',
        icon: <ClipboardCheck className="nav-item-icon" aria-hidden="true" />,
        badge: 'FE-04',
      },
      {
        path: '/verification',
        label: 'Document AI & Checks',
        icon: <ShieldCheck className="nav-item-icon" aria-hidden="true" />,
        badge: 'DOC-04',
      },
      {
        path: '/evc',
        label: 'EVC Ground Inspection',
        icon: <MapPin className="nav-item-icon" aria-hidden="true" />,
        badge: 'FE-06',
      },
    ],
  },
  {
    section: 'Governance & Audit',
    items: [
      {
        path: '/rules',
        label: 'APH Regulatory Rules',
        icon: <BookOpen className="nav-item-icon" aria-hidden="true" />,
        badge: 'BE-05',
      },
      {
        path: '/audit',
        label: 'Audit Ledger & Proofs',
        icon: <History className="nav-item-icon" aria-hidden="true" />,
        badge: 'BE-07',
      },
      {
        path: '/settings',
        label: 'Platform Settings',
        icon: <Settings className="nav-item-icon" aria-hidden="true" />,
      },
    ],
  },
];

export interface SidebarProps {
  onNavClick?: () => void;
}

export function Sidebar({ onNavClick }: SidebarProps): React.ReactElement {
  return (
    <aside className="app-sidebar" aria-label="Sidebar navigation">
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((group) => (
          <div key={group.section} style={{ marginBottom: '0.5rem' }}>
            <div className="nav-section-label">{group.section}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onNavClick}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`.trim()}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className="badge badge-default nav-item-badge"
                    style={{ fontSize: '0.625rem', padding: '1px 6px' }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
          <HelpCircle size={14} aria-hidden="true" />
          <span>Institutional Sandbox</span>
        </div>
        <p style={{ fontSize: '0.6875rem', margin: 0, lineHeight: 1.3 }}>
          Operating in demonstration mode. Human review disposition is strictly enforced for all
          regulatory workflows.
        </p>
      </div>
    </aside>
  );
}
