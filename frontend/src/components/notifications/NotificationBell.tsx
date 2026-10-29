import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  Calendar,
  FileText,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { notificationsService } from '../../api/services/notificationsService';
import { AppNotification, NotificationSeverity, NotificationType } from '../../api/types';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'CRITICAL'>('ALL');
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationsService.getNotifications({ limit: 30 });
      setNotifications(res.items || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Soft fail in standby or mock environment
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // handled
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      // handled
    }
  };

  const handleSweepDeadlines = async () => {
    try {
      setSweeping(true);
      await notificationsService.sweepDeadlines();
      await loadNotifications();
    } catch {
      // handled
    } finally {
      setSweeping(false);
    }
  };

  const handleItemClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      notificationsService.markAsRead(notification.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (notification.linkUrl) {
      navigate(notification.linkUrl);
    } else if (notification.applicationId) {
      navigate(`/applications/${notification.applicationId}`);
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'UNREAD') return !item.isRead;
    if (activeTab === 'CRITICAL') {
      return (
        item.severity === NotificationSeverity.CRITICAL ||
        item.severity === NotificationSeverity.ACTION_REQUIRED ||
        item.type === NotificationType.SLA_BREACH ||
        item.type === NotificationType.SLA_WARNING
      );
    }
    return true;
  });

  const getSeverityIcon = (item: AppNotification) => {
    if (item.type === NotificationType.SLA_BREACH || item.severity === NotificationSeverity.CRITICAL) {
      return <AlertOctagon size={16} style={{ color: '#dc2626' }} />;
    }
    if (item.type === NotificationType.SLA_WARNING || item.severity === NotificationSeverity.WARNING) {
      return <AlertTriangle size={16} style={{ color: '#d97706' }} />;
    }
    if (item.type === NotificationType.EVC_SCHEDULED) {
      return <Calendar size={16} style={{ color: '#2563eb' }} />;
    }
    if (item.type === NotificationType.UNDERTAKING_EXPIRING || item.type === NotificationType.DOCUMENT_EXPIRING) {
      return <FileText size={16} style={{ color: '#b45309' }} />;
    }
    return <Info size={16} style={{ color: '#0284c7' }} />;
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-full)',
          background: isOpen ? 'var(--color-surface-hover)' : 'transparent',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
          color: unreadCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)',
          transition: 'all 0.15s ease',
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              fontSize: '0.625rem',
              fontWeight: 700,
              lineHeight: '18px',
              color: '#ffffff',
              backgroundColor: '#dc2626',
              borderRadius: '9999px',
              textAlign: 'center',
              boxShadow: '0 0 0 2px #ffffff',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Alerts and Notifications Center"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxWidth: '90vw',
            maxHeight: '520px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  Regulatory Alerts &amp; Escalations Feed
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                  {unreadCount} unread action{unreadCount === 1 ? '' : 's'} / deadlines
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={handleSweepDeadlines}
                disabled={sweeping}
                title="Sweep SLA timers, undertakings & doc expiries"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '3px 6px',
                  fontSize: '0.6875rem',
                  color: 'var(--color-primary)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: sweeping ? 'wait' : 'pointer',
                }}
              >
                <RefreshCw size={11} className={sweeping ? 'animate-spin' : ''} />
                <span>Sweep</span>
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '3px 6px',
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-muted)',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  <CheckCheck size={11} />
                  <span>All Read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              padding: '0.375rem 0.75rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {(['ALL', 'UNREAD', 'CRITICAL'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '2px 8px',
                  fontSize: '0.6875rem',
                  fontWeight: activeTab === tab ? 600 : 500,
                  color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  border: activeTab === tab ? '1px solid var(--color-border)' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {tab === 'ALL' ? 'All Alerts' : tab === 'UNREAD' ? `Unread (${unreadCount})` : 'Urgent & SLA'}
              </button>
            ))}
          </div>

          {/* Alert List */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '360px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                Checking compliance and SLA alerts...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                No notifications matching current view.
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    backgroundColor: item.isRead ? '#ffffff' : '#f0f9ff',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.625rem',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = item.isRead ? '#ffffff' : '#f0f9ff')
                  }
                >
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>{getSeverityIcon(item)}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: item.isRead ? 500 : 700,
                          color: 'var(--color-text-main)',
                        }}
                      >
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          title="Mark read"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <CheckCheck size={12} />
                        </button>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: '0.6875rem',
                        color: 'var(--color-text-muted)',
                        margin: '2px 0 4px 0',
                        lineHeight: 1.35,
                      }}
                    >
                      {item.message}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.625rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {(item.linkUrl || item.applicationId) && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            color: 'var(--color-primary)',
                            fontWeight: 500,
                          }}
                        >
                          View Case <ExternalLink size={10} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid var(--color-border)',
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            AICTE Regulation Bureau • Time-Bound Compliance Engine
          </div>
        </div>
      )}
    </div>
  );
};

