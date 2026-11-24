import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  Store,
  BookOpen,
  DollarSign,
  Search,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Clock,
  Package,
} from 'lucide-react';
import type { User, ManagerStatus } from '@/types/auth';
import type { StoreViewMode } from '@/pages/Store/types/store';
import { getAuthHeaders } from '@/services/authService';
import styles from './AdminDashboardPage.module.css';

export interface AdminDashboardPageProps {
  user: User | null;
  onNavigateStore: (view: StoreViewMode) => void;
  onSignOutClick: () => void;
}

type AdminTab = 'overview' | 'managers' | 'users' | 'products' | 'revenue';

interface ManagerRecord {
  id: string;
  username: string;
  email: string;
  business_name: string;
  manager_status: ManagerStatus;
  products_count: number;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: string;
  display_name: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  user,
  onNavigateStore,
  onSignOutClick,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Overview metrics state
  const [metrics, setMetrics] = useState({
    total_products: 0,
    total_users: 0,
    total_managers: 0,
    pending_managers: 0,
    approved_managers: 0,
    rejected_managers: 0,
    suspended_managers: 0,
    available_units: 0,
    out_of_stock_count: 0,
    completed_orders_count: 0,
    gross_revenue: '0.00',
  });

  // Managers tab state
  const [managers, setManagers] = useState<ManagerRecord[]>([]);
  const [managerSearch, setManagerSearch] = useState('');
  const [managerStatusFilter, setManagerStatusFilter] = useState('');

  // Users tab state
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Products tab state
  const [productsList, setProductsList] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Revenue tab state
  const [revenueData, setRevenueData] = useState<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/store/admin/overview/', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch {
      // safe fallback
    }
  }, []);

  const fetchManagers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (managerStatusFilter) params.set('status', managerStatusFilter);
      if (managerSearch) params.set('search', managerSearch);

      const res = await fetch(`/api/store/admin/managers/?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setManagers(data.managers || []);
      }
    } catch {
      // safe fallback
    }
  }, [managerStatusFilter, managerSearch]);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (userRoleFilter) params.set('role', userRoleFilter);
      if (userSearch) params.set('search', userSearch);

      const res = await fetch(`/api/store/admin/users/?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch {
      // safe fallback
    }
  }, [userRoleFilter, userSearch]);

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (productSearch) params.set('search', productSearch);

      const res = await fetch(`/api/store/admin/products/?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setProductsList(data.products || []);
      }
    } catch {
      // safe fallback
    }
  }, [productSearch]);

  const fetchRevenue = useCallback(async () => {
    try {
      const res = await fetch('/api/store/admin/revenue/', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setRevenueData(data);
      }
    } catch {
      // safe fallback
    }
  }, []);

  // Dispatch data loader on tab change
  useEffect(() => {
    setLoading(true);
    const p =
      activeTab === 'overview'
        ? fetchOverview()
        : activeTab === 'managers'
        ? fetchManagers()
        : activeTab === 'users'
        ? fetchUsers()
        : activeTab === 'products'
        ? fetchProducts()
        : fetchRevenue();

    p.finally(() => setLoading(false));
  }, [activeTab, fetchOverview, fetchManagers, fetchUsers, fetchProducts, fetchRevenue]);

  const handleManagerAction = async (
    managerId: string,
    action: 'approve' | 'reject' | 'suspend' | 'reactivate'
  ) => {
    try {
      const res = await fetch(`/api/store/admin/managers/${managerId}/action/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Action ${action} executed successfully.`);
        fetchManagers();
        fetchOverview();
      } else {
        showToast(data.detail || 'Action failed.');
      }
    } catch {
      showToast('Network error executing manager action.');
    }
  };

  const handleUserAction = async (userId: string, action: 'suspend' | 'reactivate') => {
    try {
      const res = await fetch(`/api/store/admin/users/${userId}/action/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `User account successfully ${action}ed.`);
        fetchUsers();
        fetchOverview();
      } else {
        showToast(data.detail || 'User action failed.');
      }
    } catch {
      showToast('Network error executing user action.');
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <AlertTriangle size={48} color="#EF4444" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            Restricted Administrator Console
          </h2>
          <p style={{ color: '#4B5563', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Access to this console requires elevated Administrator privileges. You are currently
            authenticated as {user?.username ? <strong>{user.username}</strong> : 'Guest'}.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            {user?.role === 'STORE_MANAGER' && (!user.manager_status || user.manager_status === 'APPROVED') && (
              <button
                type="button"
                className={styles.btnApprove}
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
                onClick={() => onNavigateStore('store-manager')}
              >
                <span>Go to Store Manager Portal</span>
              </button>
            )}
            <button
              type="button"
              className={styles.returnBtn}
              onClick={() => onNavigateStore('store')}
            >
              <ArrowLeft size={16} />
              <span>Return to Akashic Store</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer} data-testid="admin-dashboard-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toast} role="status">
          <CheckCircle size={18} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Left Sidebar Navigation ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandIcon}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className={styles.brandTitle}>Akashic Admin</div>
            <div className={styles.brandSubtitle}>Central Console</div>
          </div>
        </div>

        <nav className={styles.navGroup}>
          <button
            type="button"
            className={`${styles.navItem} ${activeTab === 'overview' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('overview')}
            data-testid="admin-tab-overview"
          >
            <ShieldCheck size={18} />
            <span>Store Health</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === 'managers' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('managers')}
            data-testid="admin-tab-managers"
          >
            <Store size={18} />
            <span>Store Managers</span>
            {metrics.pending_managers > 0 && (
              <span className={styles.badgePending}>{metrics.pending_managers}</span>
            )}
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === 'users' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('users')}
            data-testid="admin-tab-users"
          >
            <Users size={18} />
            <span>Patrons & Users</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === 'products' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('products')}
            data-testid="admin-tab-products"
          >
            <BookOpen size={18} />
            <span>Global Catalogue</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === 'revenue' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('revenue')}
            data-testid="admin-tab-revenue"
          >
            <DollarSign size={18} />
            <span>Sales & Revenue</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.returnBtn}
            onClick={() => onNavigateStore('store')}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Store</span>
          </button>

          <button
            type="button"
            className={styles.returnBtn}
            onClick={onSignOutClick}
            style={{ width: '100%', justifyContent: 'center', color: '#DC2626' }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content View ── */}
      <main className={styles.mainArea}>
        <header className={styles.headerBar}>
          <div>
            <h1 className={styles.headerTitle}>
              {activeTab === 'overview' && 'Store Operations Overview'}
              {activeTab === 'managers' && 'Store Manager Verification & Accounts'}
              {activeTab === 'users' && 'Patron & User Directory'}
              {activeTab === 'products' && 'Global Edition Catalogue'}
              {activeTab === 'revenue' && 'Store Revenue & Settlement Analytics'}
            </h1>
            <p className={styles.headerSubtitle}>
              Authenticated as Head Archivist ({user.username}) • Role: ADMIN
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.returnBtn}
              disabled={loading}
              onClick={() => {
                if (activeTab === 'overview') fetchOverview();
                if (activeTab === 'managers') fetchManagers();
                if (activeTab === 'users') fetchUsers();
                if (activeTab === 'products') fetchProducts();
                if (activeTab === 'revenue') fetchRevenue();
              }}
              title="Refresh data"
            >
              <RefreshCw size={15} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* ── TAB 1: OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div>
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>Total Editions</span>
                    <div className={styles.metricIcon} style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                      <BookOpen size={20} />
                    </div>
                  </div>
                  <div className={styles.metricValue}>{metrics.total_products}</div>
                  <div className={styles.metricHint}>Across all curator shelves</div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>Store Managers</span>
                    <div className={styles.metricIcon} style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                      <Store size={20} />
                    </div>
                  </div>
                  <div className={styles.metricValue}>{metrics.total_managers}</div>
                  <div className={styles.metricHint}>
                    {metrics.pending_managers > 0
                      ? `⚠️ ${metrics.pending_managers} awaiting review`
                      : 'All managers vetted'}
                  </div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>Registered Users</span>
                    <div className={styles.metricIcon} style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                      <Users size={20} />
                    </div>
                  </div>
                  <div className={styles.metricValue}>{metrics.total_users}</div>
                  <div className={styles.metricHint}>Active patrons & collectors</div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>Available Stock</span>
                    <div className={styles.metricIcon} style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                      <Package size={20} />
                    </div>
                  </div>
                  <div className={styles.metricValue}>{metrics.available_units}</div>
                  <div className={styles.metricHint}>Total units ready to ship</div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>Gross Revenue</span>
                    <div className={styles.metricIcon} style={{ backgroundColor: '#FDF2F8', color: '#DB2777' }}>
                      <DollarSign size={20} />
                    </div>
                  </div>
                  <div className={styles.metricValue}>${metrics.gross_revenue}</div>
                  <div className={styles.metricHint}>Stage 5 Checkout settlements</div>
                </div>
              </div>

              {/* Quick Action Alerts */}
              {metrics.pending_managers > 0 && (
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    borderRadius: '0.75rem',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '2rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Clock size={24} color="#D97706" />
                    <div>
                      <strong style={{ color: '#92400E', fontSize: '1rem' }}>
                        {metrics.pending_managers} Store Manager Application
                        {metrics.pending_managers > 1 ? 's' : ''} Pending Review
                      </strong>
                      <p style={{ margin: '0.15rem 0 0 0', color: '#B45309', fontSize: '0.875rem' }}>
                        Curators have registered and are waiting for account verification to manage
                        editions.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.returnBtn}
                    onClick={() => {
                      setManagerStatusFilter('PENDING');
                      setActiveTab('managers');
                    }}
                    style={{ backgroundColor: '#D97706', color: '#FFFFFF', borderColor: '#B45309' }}
                  >
                    <span>Review Applications</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: STORE MANAGERS ── */}
          {activeTab === 'managers' && (
            <div className={styles.tableCard}>
              <div className={styles.tableToolbar}>
                <div className={styles.searchBox}>
                  <Search size={16} color="#9CA3AF" />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search by username, email or business name..."
                    value={managerSearch}
                    onChange={(e) => setManagerSearch(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <select
                    className={styles.filterSelect}
                    value={managerStatusFilter}
                    onChange={(e) => setManagerStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="APPROVED">Approved / Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              {managers.length === 0 ? (
                <div className={styles.emptyState}>No Store Managers found matching filters.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Curator / Username</th>
                      <th>Store / Business Name</th>
                      <th>Email Address</th>
                      <th>Status</th>
                      <th>Books</th>
                      <th>Approved By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managers.map((mgr) => (
                      <tr key={mgr.id}>
                        <td>
                          <strong>{mgr.username}</strong>
                        </td>
                        <td>{mgr.business_name || '—'}</td>
                        <td>{mgr.email}</td>
                        <td>
                          <span
                            className={`
                              ${styles.statusPill}
                              ${
                                mgr.manager_status === 'APPROVED'
                                  ? styles.statusApproved
                                  : mgr.manager_status === 'PENDING'
                                  ? styles.statusPending
                                  : mgr.manager_status === 'SUSPENDED'
                                  ? styles.statusSuspended
                                  : styles.statusRejected
                              }
                            `}
                          >
                            {mgr.manager_status}
                          </span>
                        </td>
                        <td>{mgr.products_count}</td>
                        <td>{mgr.approved_by || '—'}</td>
                        <td>
                          <div className={styles.actionBtnGroup}>
                            {mgr.manager_status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  className={styles.btnApprove}
                                  onClick={() => handleManagerAction(mgr.id, 'approve')}
                                  data-testid={`approve-mgr-${mgr.username}`}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className={styles.btnReject}
                                  onClick={() => handleManagerAction(mgr.id, 'reject')}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {mgr.manager_status === 'APPROVED' && (
                              <button
                                type="button"
                                className={styles.btnSuspend}
                                onClick={() => handleManagerAction(mgr.id, 'suspend')}
                              >
                                Suspend
                              </button>
                            )}
                            {(mgr.manager_status === 'SUSPENDED' ||
                              mgr.manager_status === 'REJECTED') && (
                              <button
                                type="button"
                                className={styles.btnApprove}
                                onClick={() => handleManagerAction(mgr.id, 'reactivate')}
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── TAB 3: USERS ── */}
          {activeTab === 'users' && (
            <div className={styles.tableCard}>
              <div className={styles.tableToolbar}>
                <div className={styles.searchBox}>
                  <Search size={16} color="#9CA3AF" />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search patrons by handle or correspondence email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>

                <select
                  className={styles.filterSelect}
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="USER">Patron (USER)</option>
                  <option value="STORE_MANAGER">Store Manager</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="MODERATOR">Moderator</option>
                </select>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Full Name & Username</th>
                    <th>Email Address</th>
                    <th>Registration Date</th>
                    <th>Current Role</th>
                    <th>Account Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.full_name || u.display_name || u.username}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>@{u.username}</div>
                      </td>
                      <td>{u.email}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              u.role === 'ADMIN'
                                ? '#D97706'
                                : u.role === 'STORE_MANAGER'
                                ? '#059669'
                                : '#4B5563',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: u.is_active ? '#D1FAE5' : '#FEE2E2',
                            color: u.is_active ? '#065F46' : '#991B1B',
                          }}
                        >
                          {u.is_active ? '● Active' : '○ Suspended'}
                        </span>
                      </td>
                      <td>
                        {u.id === user?.id ? (
                          <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                            Current Admin (Self)
                          </span>
                        ) : u.is_active ? (
                          <button
                            type="button"
                            className={styles.btnSuspend}
                            onClick={() => handleUserAction(u.id, 'suspend')}
                            data-testid={`suspend-user-${u.username}`}
                            title="Suspend user account and block access"
                          >
                            Suspend Account
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.btnApprove}
                            onClick={() => handleUserAction(u.id, 'reactivate')}
                            data-testid={`reactivate-user-${u.username}`}
                            title="Reactivate user account access"
                          >
                            Reactivate Account
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB 4: PRODUCTS ── */}
          {activeTab === 'products' && (
            <div className={styles.tableCard}>
              <div className={styles.tableToolbar}>
                <div className={styles.searchBox}>
                  <Search size={16} color="#9CA3AF" />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search catalogue by title or author..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Cover</th>
                    <th>Title & Edition</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Curator / Store</th>
                  </tr>
                </thead>
                <tbody>
                  {productsList.map((p) => (
                    <tr key={p.id}>
                      <td style={{ width: 60 }}>
                        <img
                          src={p.custom_cover_url || p.cover_url || '/placeholder.png'}
                          alt={p.title}
                          style={{
                            width: 36,
                            height: 50,
                            objectFit: 'cover',
                            borderRadius: 4,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                        />
                      </td>
                      <td>
                        <strong>{p.title}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                          {p.authors?.join(', ') || 'Unknown'} • {p.edition || 'Standard Edition'}
                        </div>
                      </td>
                      <td>
                        <strong>${parseFloat(p.price || '0').toFixed(2)}</strong>
                      </td>
                      <td>{p.inventory?.available_quantity ?? 0} units</td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor:
                              p.status === 'IN_STOCK'
                                ? '#D1FAE5'
                                : p.status === 'LOW_STOCK'
                                ? '#FEF3C7'
                                : '#FEE2E2',
                            color:
                              p.status === 'IN_STOCK'
                                ? '#065F46'
                                : p.status === 'LOW_STOCK'
                                ? '#92400E'
                                : '#991B1B',
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <div>{p.manager?.business_name || p.manager?.username || 'System'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB 5: REVENUE ── */}
          {activeTab === 'revenue' && (
            <div>
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Gross Volume</div>
                  <div className={styles.metricValue}>${revenueData?.gross_revenue || '0.00'}</div>
                  <div className={styles.metricHint}>Settled orders to date</div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Net Store Proceeds</div>
                  <div className={styles.metricValue}>${revenueData?.net_revenue || '0.00'}</div>
                  <div className={styles.metricHint}>After curator disbursements</div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Completed Orders</div>
                  <div className={styles.metricValue}>{revenueData?.total_orders || 0}</div>
                  <div className={styles.metricHint}>Stage 5 Checkout integration</div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.75rem',
                  padding: '2rem',
                  textAlign: 'center',
                }}
              >
                <DollarSign size={40} color="#10B981" style={{ marginBottom: '0.75rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                  Revenue Settlement Architecture Active
                </h3>
                <p style={{ color: '#6B7280', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
                  {revenueData?.status_note ||
                    'Revenue tables are connected to PostgreSQL transactions and will populate automatically as patron orders are placed in Stage 5.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
