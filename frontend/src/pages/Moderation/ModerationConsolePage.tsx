import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  EyeOff,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Clock,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchModerationReports,
  fetchModerationReportDetail,
  resolveModerationReport,
  hideContent,
  restoreContent,
  fetchModerationAudits,
} from '@/services/reportService';
import type { ReportItem, ModerationAuditItem, TargetTypeCode } from '@/types/moderation';
import styles from './ModerationConsolePage.module.css';

export interface ModerationConsolePageProps {
  onNavigateHome: () => void;
  onSignInRequest?: () => void;
}

export const ModerationConsolePage: React.FC<ModerationConsolePageProps> = ({
  onNavigateHome,
  onSignInRequest,
}) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('PENDING');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TargetTypeCode>('ALL');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionNote, setActionNote] = useState('');
  const [confirmHideOpen, setConfirmHideOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

  const [audits, setAudits] = useState<ModerationAuditItem[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  // Check if role is authorized
  const isAuthorized = Boolean(
    isAuthenticated && user && (user.role === 'MODERATOR' || user.role === 'ADMIN')
  );

  const loadReports = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchModerationReports({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        target_type: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      const validReports = Array.isArray(data) ? data : [];
      setReports(validReports);
      if (validReports.length > 0 && !selectedReportId && validReports[0]) {
        setSelectedReportId(validReports[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve moderation reports.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, statusFilter, typeFilter, selectedReportId]);

  useEffect(() => {
    if (isAuthorized) {
      loadReports();
    }
  }, [isAuthorized, statusFilter, typeFilter, loadReports]);

  // Load detail whenever selectedReportId changes
  useEffect(() => {
    if (!selectedReportId || !isAuthorized) {
      setSelectedReport(null);
      return;
    }

    let isMounted = true;
    const detailPromise = fetchModerationReportDetail(selectedReportId);
    if (detailPromise && typeof detailPromise.then === 'function') {
      detailPromise
        .then((detail) => {
          if (isMounted) setSelectedReport(detail);
        })
        .catch(() => {
          const local = (reports || []).find((r) => r.id === selectedReportId) || null;
          if (isMounted) setSelectedReport(local);
        });
    } else {
      const local = (reports || []).find((r) => r.id === selectedReportId) || null;
      setSelectedReport(local);
    }

    // Also load audit trail for this report or target
    setLoadingAudits(true);
    const auditPromise = fetchModerationAudits({ report_id: selectedReportId });
    if (auditPromise && typeof auditPromise.then === 'function') {
      auditPromise
        .then((items) => {
          if (isMounted) setAudits(Array.isArray(items) ? items : []);
        })
        .catch(() => {
          if (isMounted) setAudits([]);
        })
        .finally(() => {
          if (isMounted) setLoadingAudits(false);
        });
    } else {
      setLoadingAudits(false);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedReportId, isAuthorized, reports]);

  // Handle report resolution (RESOLVED or DISMISSED)
  const handleResolveAction = async (action: 'RESOLVED' | 'DISMISSED') => {
    if (!selectedReportId || actionLoading) return;
    setActionLoading(true);
    setError(null);

    try {
      const updated = await resolveModerationReport(selectedReportId, {
        action,
        note: actionNote.trim() || undefined,
      });

      setSelectedReport(updated);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setActionNote('');

      // Refresh audits
      const auditItems = await fetchModerationAudits({ report_id: selectedReportId });
      setAudits(auditItems);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resolve report.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle soft-hide content
  const handleHideContent = async () => {
    if (!selectedReport || actionLoading) return;
    setActionLoading(true);
    setError(null);

    try {
      await hideContent(selectedReport.target_type, selectedReport.target_id, {
        note: actionNote.trim() || undefined,
        report_id: selectedReport.id,
      });

      // Update local report state
      setSelectedReport((prev) => (prev ? { ...prev, target_status: 'HIDDEN' } : null));
      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id ? { ...r, target_status: 'HIDDEN' } : r
        )
      );
      setConfirmHideOpen(false);
      setActionNote('');

      // Refresh audits
      const auditItems = await fetchModerationAudits({ report_id: selectedReport.id });
      setAudits(auditItems);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to hide content.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle restore content
  const handleRestoreContent = async () => {
    if (!selectedReport || actionLoading) return;
    setActionLoading(true);
    setError(null);

    try {
      await restoreContent(selectedReport.target_type, selectedReport.target_id, {
        note: actionNote.trim() || undefined,
        report_id: selectedReport.id,
      });

      // Update local report state
      setSelectedReport((prev) => (prev ? { ...prev, target_status: 'VISIBLE' } : null));
      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id ? { ...r, target_status: 'VISIBLE' } : r
        )
      );
      setConfirmRestoreOpen(false);
      setActionNote('');

      // Refresh audits
      const auditItems = await fetchModerationAudits({ report_id: selectedReport.id });
      setAudits(auditItems);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restore content.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Derived Overview Counts
  const safeReports = Array.isArray(reports) ? reports : [];
  const pendingCount = safeReports.filter((r) => r && r.status === 'PENDING').length;
  const resolvedCount = safeReports.filter((r) => r && r.status === 'RESOLVED').length;
  const dismissedCount = safeReports.filter((r) => r && r.status === 'DISMISSED').length;

  // Loading state
  if (authLoading) {
    return (
      <div className={styles.consoleContainer}>
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Verifying curator credentials...
        </p>
      </div>
    );
  }

  // Unauthenticated visitor
  if (!isAuthenticated) {
    return (
      <div className={styles.consoleContainer}>
        <div className={styles.unauthorizedCard} data-testid="moderation-unauthenticated">
          <ShieldAlert size={48} style={{ color: 'var(--color-action-primary)' }} />
          <h2 className={styles.unauthorizedTitle}>Curator Sign-In Required</h2>
          <p className={styles.unauthorizedText}>
            Access to the Akashic Moderation Console is reserved exclusively for appointed curators
            and archivist administrators.
          </p>
          <button
            type="button"
            className={styles.returnHomeBtn}
            onClick={onSignInRequest || onNavigateHome}
          >
            Sign In with Curator Account
          </button>
        </div>
      </div>
    );
  }

  // Unauthorized Patron (USER or STORE_MANAGER)
  if (!isAuthorized) {
    return (
      <div className={styles.consoleContainer}>
        <div className={styles.unauthorizedCard} data-testid="moderation-unauthorized">
          <ShieldAlert size={48} style={{ color: 'var(--color-action-primary)' }} />
          <h2 className={styles.unauthorizedTitle}>Access Denied (403)</h2>
          <p className={styles.unauthorizedText}>
            Your patron account ({user?.role}) does not hold curatorial or administrative
            privileges to access the moderation ledger.
          </p>
          <button type="button" className={styles.returnHomeBtn} onClick={onNavigateHome}>
            Return to Library Discovery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.consoleContainer} data-testid="moderator-console-page">
      {/* ── Header ── */}
      <header className={styles.consoleHeader}>
        <div className={styles.headerTitleGroup}>
          <div className={styles.headerBadgeRow}>
            <span className={styles.curatorBadge} data-testid="curator-role-badge">
              <Shield size={13} aria-hidden="true" />
              {user?.role === 'ADMIN' ? 'Archivist Administrator' : 'Appointed Curator'}
            </span>
          </div>
          <h1 className={styles.consoleTitle}>Moderation Console</h1>
          <p className={styles.consoleSubtitle}>
            Custodial ledger for managing patron content reports, dialogue health, and community
            covenants. Review flagged inscriptions with deliberative patience.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={loadReports}
            disabled={loading}
            aria-label="Refresh report queue"
            data-testid="refresh-queue-btn"
          >
            <RotateCw size={14} className={loading ? 'spinning' : ''} aria-hidden="true" />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </header>

      {/* ── Stats Overview ── */}
      <section className={styles.statsGrid} aria-label="Moderation Ledger Overview">
        <div className={styles.statCard} data-testid="stat-total-reports">
          <div className={styles.statIconBox} style={{ backgroundColor: 'rgba(139, 38, 38, 0.08)' }}>
            <FileText size={20} style={{ color: 'var(--color-action-primary)' }} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{reports.length}</span>
            <span className={styles.statLabel}>Inscribed Reports</span>
          </div>
        </div>

        <div className={styles.statCard} data-testid="stat-pending-reports">
          <div className={styles.statIconBox} style={{ backgroundColor: '#fef3c7' }}>
            <Clock size={20} style={{ color: '#92400e' }} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{pendingCount}</span>
            <span className={styles.statLabel}>Pending Review</span>
          </div>
        </div>

        <div className={styles.statCard} data-testid="stat-resolved-reports">
          <div className={styles.statIconBox} style={{ backgroundColor: '#d1fae5' }}>
            <CheckCircle size={20} style={{ color: '#065f46' }} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{resolvedCount}</span>
            <span className={styles.statLabel}>Resolved</span>
          </div>
        </div>

        <div className={styles.statCard} data-testid="stat-dismissed-reports">
          <div className={styles.statIconBox} style={{ backgroundColor: '#f3f4f6' }}>
            <XCircle size={20} style={{ color: '#4b5563' }} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{dismissedCount}</span>
            <span className={styles.statLabel}>Dismissed</span>
          </div>
        </div>
      </section>

      {/* ── Filter Bar ── */}
      <section className={styles.filterBar} aria-label="Report Filter Controls">
        <div className={styles.statusTabs} role="tablist" aria-label="Report Status Filter">
          {(['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab}
              className={`${styles.statusTabBtn} ${statusFilter === tab ? styles.statusTabBtnActive : ''}`}
              onClick={() => setStatusFilter(tab)}
              data-testid={`filter-tab-${tab.toLowerCase()}`}
            >
              {tab === 'ALL'
                ? 'All Statuses'
                : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className={styles.typeFilterWrapper}>
          <label htmlFor="target-type-select" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Content Type:
          </label>
          <select
            id="target-type-select"
            className={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | TargetTypeCode)}
            data-testid="content-type-filter"
          >
            <option value="ALL">All Content Types</option>
            <option value="DISCUSSION">Discussions</option>
            <option value="REPLY">Discussion Replies</option>
            <option value="REVIEW">Book Reviews</option>
            <option value="REVIEW_REPLY">Review Replies</option>
            <option value="ANNOTATION">Shared Marginalia</option>
          </select>
        </div>
      </section>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            marginBottom: 'var(--space-6)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          role="alert"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 2-Column Main Workspace ── */}
      <div className={styles.workspaceGrid}>
        {/* Left Column: Report Queue */}
        <section className={styles.queueColumn} aria-label="Moderation Report Queue">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
              Report Queue ({safeReports.length})
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)' }}>
              Loading report queue...
            </div>
          ) : safeReports.length === 0 ? (
            <div className={styles.emptyQueue} data-testid="empty-queue-message">
              <ShieldCheck size={36} style={{ color: '#065f46' }} aria-hidden="true" />
              <h3 className={styles.emptyQueueTitle}>Quiet Stacks</h3>
              <p className={styles.emptyQueueDesc}>
                No reports matching the selected filters require curatorial attention at this hour.
              </p>
            </div>
          ) : (
            safeReports.map((report) => {
              const isSelected = selectedReportId === report.id;
              const dateStr = report.created_at
                ? new Date(report.created_at * 1000).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : '';

              return (
                <article
                  key={report.id}
                  className={`${styles.queueCard} ${isSelected ? styles.queueCardActive : ''}`}
                  onClick={() => setSelectedReportId(report.id)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  data-testid={`report-queue-item-${report.id}`}
                >
                  <div className={styles.queueCardTop}>
                    <span className={styles.targetTypeBadge}>{report.target_type}</span>
                    <span
                      className={`${styles.statusPill} ${
                        report.status === 'RESOLVED'
                          ? styles.statusResolved
                          : report.status === 'DISMISSED'
                          ? styles.statusDismissed
                          : styles.statusPending
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  <div className={styles.queueReason}>{report.reason}</div>

                  {report.target_content && (
                    <div className={styles.queueSnippet}>&ldquo;{report.target_content}&rdquo;</div>
                  )}

                  <div className={styles.queueMetaRow}>
                    <span>By: {report.target_author?.display_name || 'Patron'}</span>
                    <span>{dateStr}</span>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Right Column: Report Context & Custodial Actions */}
        <section className={styles.detailColumn} aria-label="Report Detail and Actions" data-testid="report-detail-view">
          {!selectedReport ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-secondary)' }}>
              Select a report from the ledger on the left to examine content and record custodial decisions.
            </div>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <h2 className={styles.detailTitle}>{selectedReport.reason}</h2>
                  <span className={styles.detailMetaText}>
                    Report #{selectedReport.id.slice(0, 12)} • Inscribed{' '}
                    {selectedReport.created_at
                      ? new Date(selectedReport.created_at * 1000).toLocaleString()
                      : ''}
                  </span>
                </div>
                <span
                  className={`${styles.statusPill} ${
                    selectedReport.status === 'RESOLVED'
                      ? styles.statusResolved
                      : selectedReport.status === 'DISMISSED'
                      ? styles.statusDismissed
                      : styles.statusPending
                  }`}
                  style={{ fontSize: '13px', padding: '4px 12px' }}
                >
                  {selectedReport.status}
                </span>
              </div>

              {/* Reporter Explanation */}
              {selectedReport.details && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fdfbf7', border: '1px solid var(--color-border-subtle)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Reporter Explanation:
                  </span>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-primary)', fontStyle: 'italic' }}>
                    &ldquo;{selectedReport.details}&rdquo;
                  </p>
                </div>
              )}

              {/* Target Content Context Well */}
              <div className={styles.contextWell} data-testid="target-context-well">
                <span className={styles.contextLabel}>Flagged {selectedReport.target_type} Content</span>

                {selectedReport.target_title && (
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {selectedReport.target_title}
                  </h3>
                )}

                <p className={styles.contentPreviewQuote}>
                  {selectedReport.target_content || '[No preview content available]'}
                </p>

                <div className={styles.authorRow}>
                  <User size={14} aria-hidden="true" />
                  <span>Author: <strong>{selectedReport.target_author?.display_name || 'Patron'}</strong></span>
                  {selectedReport.context?.book_title && (
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BookOpen size={13} aria-hidden="true" />
                      Folio: {selectedReport.context.book_title}
                    </span>
                  )}
                </div>

                <div className={styles.targetStatusRow}>
                  <span>Current Public Visibility:</span>
                  <strong
                    style={{
                      color:
                        selectedReport.target_status === 'HIDDEN'
                          ? '#991b1b'
                          : '#065f46',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {selectedReport.target_status === 'HIDDEN' ? (
                      <>
                        <EyeOff size={14} aria-hidden="true" />
                        Hidden from Public Discovery
                      </>
                    ) : (
                      <>
                        <Eye size={14} aria-hidden="true" />
                        Visible in Public Feeds
                      </>
                    )}
                  </strong>
                </div>
              </div>

              {/* Custodial Operations Box */}
              <div className={styles.actionsBox}>
                <h4 className={styles.actionSectionTitle}>Custodial Decisions</h4>

                <textarea
                  className={styles.noteTextarea}
                  placeholder="Record an optional custodial note for this decision (persisted in audit ledger)..."
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={2}
                  aria-label="Custodial decision note"
                />

                {/* 1. Report Resolution Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    Report Status Action:
                  </span>
                  <div className={styles.actionBtnRow}>
                    <button
                      type="button"
                      className={styles.resolveBtn}
                      onClick={() => handleResolveAction('RESOLVED')}
                      disabled={actionLoading || selectedReport.status === 'RESOLVED'}
                      data-testid="resolve-report-btn"
                    >
                      <CheckCircle size={15} aria-hidden="true" />
                      <span>{actionLoading ? 'Recording...' : 'Resolve Report'}</span>
                    </button>

                    <button
                      type="button"
                      className={styles.dismissBtn}
                      onClick={() => handleResolveAction('DISMISSED')}
                      disabled={actionLoading || selectedReport.status === 'DISMISSED'}
                      data-testid="dismiss-report-btn"
                    >
                      <XCircle size={15} aria-hidden="true" />
                      <span>{actionLoading ? 'Recording...' : 'Dismiss Report'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Content Visibility Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px dashed var(--color-border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    Target Content Visibility:
                  </span>
                  <div className={styles.actionBtnRow}>
                    {selectedReport.target_status !== 'HIDDEN' ? (
                      <button
                        type="button"
                        className={styles.hideBtn}
                        onClick={() => setConfirmHideOpen(true)}
                        disabled={actionLoading}
                        data-testid="hide-content-btn"
                      >
                        <EyeOff size={15} aria-hidden="true" />
                        <span>Soft-Hide Content</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.restoreBtn}
                        onClick={() => setConfirmRestoreOpen(true)}
                        disabled={actionLoading}
                        data-testid="restore-content-btn"
                      >
                        <Eye size={15} aria-hidden="true" />
                        <span>Restore Content Visibility</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit History Trail */}
              <div style={{ marginTop: 'var(--space-2)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
                  Archival Audit Trail
                </span>
                {loadingAudits ? (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Loading audit events...</p>
                ) : audits.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    No prior moderation actions recorded for this report.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {audits.map((audit) => (
                      <li
                        key={audit.id}
                        style={{
                          fontSize: '12px',
                          padding: '6px 10px',
                          backgroundColor: 'var(--color-surface-inset)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          border: '1px solid var(--color-border-subtle)',
                        }}
                      >
                        <span>
                          <strong>{audit.action}</strong> by {audit.moderator_display_name}
                          {audit.note ? `: “${audit.note}”` : ''}
                        </span>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                          {audit.created_at ? new Date(audit.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ── Confirmation Modal: Soft-Hide Content ── */}
      {confirmHideOpen && selectedReport && (
        <div className={styles.modalOverlay} role="presentation" data-testid="confirm-hide-modal">
          <div className={styles.modalDialog} role="dialog" aria-modal="true" aria-labelledby="hide-dialog-title" style={{ maxWidth: '440px', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', marginBottom: 'var(--space-3)' }}>
              <EyeOff size={22} aria-hidden="true" />
              <h3 id="hide-dialog-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                Soft-Hide Inscription?
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 var(--space-4) 0' }}>
              Hiding this {selectedReport.target_type.toLowerCase()} will immediately exclude it from public discovery, reading alcoves, and reader feeds. The record is permanently preserved in the archives and can be restored at any time.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setConfirmHideOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.hideBtn}
                onClick={handleHideContent}
                disabled={actionLoading}
                data-testid="confirm-hide-btn"
              >
                {actionLoading ? 'Hiding...' : 'Confirm Hide'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal: Restore Content ── */}
      {confirmRestoreOpen && selectedReport && (
        <div className={styles.modalOverlay} role="presentation" data-testid="confirm-restore-modal">
          <div className={styles.modalDialog} role="dialog" aria-modal="true" aria-labelledby="restore-dialog-title" style={{ maxWidth: '440px', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', marginBottom: 'var(--space-3)' }}>
              <Eye size={22} aria-hidden="true" />
              <h3 id="restore-dialog-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                Restore Content Visibility?
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 var(--space-4) 0' }}>
              Restoring will make this {selectedReport.target_type.toLowerCase()} visible again in accordance with its original visibility settings.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setConfirmRestoreOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.restoreBtn}
                onClick={handleRestoreContent}
                disabled={actionLoading}
                data-testid="confirm-restore-btn"
              >
                {actionLoading ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
