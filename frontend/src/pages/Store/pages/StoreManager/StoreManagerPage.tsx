import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Boxes,
  DollarSign,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  LogOut,
  ArrowLeft,
  Store,
} from 'lucide-react';
import type { User } from '@/types/auth';
import type {
  StoreProductItem,
  StoreProductCreatePayload,
  StoreProductUpdatePayload,
  StoreProductDetailContent,
} from '@/pages/Store/types/store';
import {
  getStoreProductsForManager,
  createStoreProduct,
  updateStoreProduct,
  updateStoreProductDetail,
  updateStoreInventory,
  getStoreManagerOverview,
  getStoreManagerRevenue,
} from '@/services/storeService';
import { StoreProductDrawer } from './components/StoreProductDrawer';
import styles from './StoreManagerPage.module.css';

export interface StoreManagerPageProps {
  user: User | null;
  onNavigateStore: (view: any) => void;
  onSignInClick: () => void;
  onSignOutClick?: () => void;
}

type ManagerTab = 'my-books' | 'inventory' | 'revenue';

export function StoreManagerPage({
  user,
  onNavigateStore,
  onSignInClick,
  onSignOutClick,
}: StoreManagerPageProps) {
  // ── 1. Role & Status Gating (Exclusively STORE_MANAGER) ──
  const isManager = user?.role === 'STORE_MANAGER';
  const isApproved =
    isManager && (!user.manager_status || user.manager_status === 'APPROVED');

  const [activeTab, setActiveTab] = useState<ManagerTab>('my-books');
  const [products, setProducts] = useState<StoreProductItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Scoped metrics & revenue states
  const [overviewData, setOverviewData] = useState<{
    total_products: number;
    in_stock_count: number;
    low_stock_count: number;
    out_of_stock_count: number;
    available_units: number;
    completed_orders_count: number;
    gross_revenue: string;
  } | null>(null);

  const [revenueData, setRevenueData] = useState<{
    total_completed_orders: number;
    gross_revenue: string;
    total_inventory_value: string;
    books: Array<{
      id: string;
      title: string;
      edition: string;
      price: string;
      quantity: number;
      inventory_value: string;
      units_sold: number;
      gross_revenue: string;
    }>;
  } | null>(null);

  // Table filters
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState<1 | 2>(1);
  const [editingProduct, setEditingProduct] = useState<StoreProductItem | null>(null);

  const fetchData = useCallback(async () => {
    if (!isApproved) return;
    setIsLoading(true);
    setError(null);
    try {
      const [prods, overview, rev] = await Promise.all([
        getStoreProductsForManager({}),
        getStoreManagerOverview().catch(() => null),
        getStoreManagerRevenue().catch(() => null),
      ]);
      setProducts(prods);
      if (overview) setOverviewData(overview);
      if (rev) setRevenueData(rev);
    } catch (err: any) {
      setError(err?.message || 'Failed to load manager catalog.');
    } finally {
      setIsLoading(false);
    }
  }, [isApproved]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick inventory update inline
  const handleQuickStockChange = async (productId: string, currentQty: number, delta: number) => {
    const newQty = Math.max(0, currentQty + delta);
    try {
      await updateStoreInventory(productId, newQty);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, quantity: newQty, available_quantity: Math.max(0, newQty - p.reserved_quantity) }
            : p
        )
      );
      // Refresh overview
      getStoreManagerOverview().then((ov) => ov && setOverviewData(ov)).catch(() => {});
      getStoreManagerRevenue().then((rv) => rv && setRevenueData(rv)).catch(() => {});
    } catch (err: any) {
      alert(`Could not update stock: ${err.message}`);
    }
  };

  // Save product from drawer (create or edit)
  const handleSaveProduct = async (
    payload: StoreProductCreatePayload | StoreProductUpdatePayload,
    isEdit: boolean,
    detailPayload?: StoreProductDetailContent
  ) => {
    if (isEdit && editingProduct) {
      await updateStoreProduct(editingProduct.id, payload as StoreProductUpdatePayload);
      if (detailPayload) {
        await updateStoreProductDetail(editingProduct.id, detailPayload);
      }
      if ('quantity' in payload && typeof payload.quantity === 'number') {
        await updateStoreInventory(editingProduct.id, payload.quantity);
      }
    } else {
      const created = await createStoreProduct(payload as StoreProductCreatePayload);
      if (detailPayload && created?.id) {
        await updateStoreProductDetail(created.id, detailPayload);
      }
    }
    await fetchData();
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchFilter ||
        p.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.authors.some((a) => a.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (p.edition || '').toLowerCase().includes(searchFilter.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, searchFilter, statusFilter]);

  // Fallback metrics
  const metrics = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.status === 'IN_STOCK').length;
    const lowStock = products.filter((p) => p.status === 'LOW_STOCK').length;
    const outOfStock = products.filter((p) => p.status === 'OUT_OF_STOCK').length;
    return { total, inStock, lowStock, outOfStock };
  }, [products]);

  // ── Admin Attempting Store Manager Portal Access ──
  if (user?.role === 'ADMIN') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.unauthorizedBox} role="alert">
          <span style={{ fontSize: '3rem' }}>🛡️</span>
          <h2 style={{ fontFamily: "var(--store-font-champ, 'Champ')", fontSize: '2rem', margin: 0 }}>
            Administrator Redirection
          </h2>
          <p style={{ color: '#4b5563', margin: 0 }}>
            Platform administrators must manage operations, review manager applications, and oversee catalogues via the Admin Dashboard.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => onNavigateStore('store-admin')}
              className={styles.addProductButton}
              data-testid="go-to-admin-dashboard-btn"
            >
              Enter Admin Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigateStore('store')}
              className={styles.secondaryBtn}
            >
              Return to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Unauthorized View (Normal Users or Unauthenticated) ──
  if (!isManager) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.unauthorizedBox} role="alert">
          <span style={{ fontSize: '3rem' }}>🔒</span>
          <h2 style={{ fontFamily: "var(--store-font-champ, 'Champ')", fontSize: '2rem', margin: 0 }}>
            Store Management Restricted
          </h2>
          <p style={{ color: '#4b5563', margin: 0 }}>
            Access to this portal is restricted exclusively to authorized Store Managers.
          </p>
          {!user ? (
            <button
              type="button"
              onClick={onSignInClick}
              className={styles.addProductButton}
            >
              Sign In as Store Manager
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateStore('store')}
              className={styles.addProductButton}
            >
              Return to Store
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Pending Application View ──
  if (user.role === 'STORE_MANAGER' && user.manager_status === 'PENDING') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.statusContainer} data-testid="curator-pending-screen">
          <div className={styles.statusIconPending}>
            <Clock size={40} color="#d97706" />
          </div>
          <h2 className={styles.statusTitle}>Application Under Review</h2>
          <p className={styles.statusText}>
            Welcome, <strong>{user.display_name || user.username}</strong>! Your application to join the Akashic Store Curator program for <strong>{user.business_name || 'your independent bookshop'}</strong> has been submitted.
          </p>
          <p className={styles.statusText} style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            Our lead curators and platform administrators verify all partner bookshops to maintain the highest quality editions. You will receive access as soon as your account is approved.
          </p>
          <div className={styles.statusActions}>
            <button
              type="button"
              onClick={() => onNavigateStore('store')}
              className={styles.addProductButton}
            >
              Browse Store as Patron
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={styles.secondaryBtn}
            >
              <RefreshCw size={16} />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Rejected Application View ──
  if (user.role === 'STORE_MANAGER' && user.manager_status === 'REJECTED') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.statusContainer}>
          <div className={styles.statusIconRejected}>
            <AlertTriangle size={40} color="#dc2626" />
          </div>
          <h2 className={styles.statusTitle}>Application Not Approved</h2>
          <p className={styles.statusText}>
            Thank you for your interest in the Akashic Store. Unfortunately, your curator application for <strong>{user.business_name || 'your store'}</strong> was not approved at this time.
          </p>
          <div className={styles.statusActions}>
            <button
              type="button"
              onClick={() => onNavigateStore('store')}
              className={styles.addProductButton}
            >
              Return to Bookstore
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Suspended Account View ──
  if (user.role === 'STORE_MANAGER' && user.manager_status === 'SUSPENDED') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.statusContainer}>
          <div className={styles.statusIconRejected}>
            <AlertTriangle size={40} color="#dc2626" />
          </div>
          <h2 className={styles.statusTitle}>Curator Account Suspended</h2>
          <p className={styles.statusText}>
            Your curator privileges have been temporarily suspended by an Akashic Administrator. Please reach out to administrative support for assistance.
          </p>
          <div className={styles.statusActions}>
            <button
              type="button"
              onClick={() => onNavigateStore('store')}
              className={styles.addProductButton}
            >
              Return to Bookstore
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Approved Store Manager Dashboard ──
  const displayTotal = overviewData?.total_products ?? metrics.total;
  const displayInStock = overviewData?.in_stock_count ?? metrics.inStock;
  const displayLowStock = overviewData?.low_stock_count ?? metrics.lowStock;
  const displayOutOfStock = overviewData?.out_of_stock_count ?? metrics.outOfStock;

  return (
    <div className={styles.pageContainer} data-testid="store-manager-page">
      {/* ── Private Store Manager Navigation Bar ── */}
      <nav className={styles.managementNav}>
        <div className={styles.navBrand}>
          <div className={styles.brandBadge}>
            <Store size={20} color="#059669" />
          </div>
          <div className={styles.brandTitles}>
            <span className={styles.brandName}>Akashic Store</span>
            <span className={styles.portalTag}>Curator Management Portal</span>
          </div>
        </div>

        <div className={styles.navUserSection}>
          <div className={styles.curatorIdentity}>
            <span className={styles.curatorBusiness}>
              {user.business_name || user.display_name || user.username}
            </span>
            <span className={styles.curatorRoleBadge}>Verified Curator</span>
          </div>

          <div className={styles.navActions}>
            <button
              type="button"
              onClick={() => onNavigateStore('store')}
              className={styles.navReturnBtn}
              title="Return to Customer Storefront"
            >
              <ArrowLeft size={16} />
              <span>Back to Store</span>
            </button>
            {onSignOutClick && (
              <button
                type="button"
                onClick={onSignOutClick}
                className={styles.navSignOutBtn}
                title="Sign out of management session"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className={styles.contentWrapper}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerTitles}>
            <h1 className={styles.pageTitle}>Store Manager Portal</h1>
            <p className={styles.pageSubtitle}>
              Curate bookstore catalogue, configure card styles, and manage inventory
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setDrawerStep(1);
              setIsDrawerOpen(true);
            }}
            className={styles.addProductButton}
            data-testid="add-new-book-button"
          >
            <Plus size={18} />
            <span>Add New Book</span>
          </button>
        </div>

        {/* Curator Profile Banner */}
        <div className={styles.curatorBanner}>
          <div className={styles.curatorInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 className={styles.curatorName}>
                {user.business_name || user.display_name || user.username}
              </h2>
              <span className={styles.approvedBadge}>
                <CheckCircle size={14} />
                <span>Verified Curator</span>
              </span>
            </div>
            <div className={styles.curatorMeta}>
              <span>Signed in as <strong>{user.email}</strong></span>
              <span>•</span>
              <span>Role: Store Curator</span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Total Products</span>
            <span className={styles.metricValue}>{displayTotal}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>In Stock</span>
            <span className={styles.metricValue} style={{ color: '#16a34a' }}>
              {displayInStock}
            </span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Low Stock</span>
            <span className={styles.metricValue} style={{ color: '#ca8a04' }}>
              {displayLowStock}
            </span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Out of Stock</span>
            <span className={styles.metricValue} style={{ color: '#dc2626' }}>
              {displayOutOfStock}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className={styles.managerNav} aria-label="Curator portal sections">
          <button
            type="button"
            className={`${styles.navTab} ${activeTab === 'my-books' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('my-books')}
          >
            <BookOpen size={16} />
            <span>Catalogue Table</span>
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeTab === 'inventory' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Boxes size={16} />
            <span>Inventory Matrix</span>
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeTab === 'revenue' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            <DollarSign size={16} />
            <span>Revenue & Sales</span>
          </button>
        </nav>

        {/* ── Tab 1: Catalogue Table ── */}
        {activeTab === 'my-books' && (
          <>
            {/* Filter Controls Bar */}
            <div className={styles.controlsBar}>
              <div className={styles.searchWrap}>
                <input
                  type="search"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search products by title, author, or edition..."
                  className={styles.searchInput}
                  aria-label="Filter products table"
                />
              </div>

              <div className={styles.filtersGroup}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={styles.filterSelect}
                  aria-label="Filter by inventory status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                  <option value="PREORDER">Preorder</option>
                  <option value="DISCONTINUED">Discontinued</option>
                </select>
              </div>
            </div>

            {/* Products Table */}
            <div className={styles.tableContainer}>
              {isLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  Loading products...
                </div>
              ) : error ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#dc2626' }}>
                  {error}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  No products found matching your search.
                </div>
              ) : (
                <table className={styles.productsTable} data-testid="store-manager-table">
                  <thead>
                    <tr>
                      <th style={{ width: '4rem' }}>Cover</th>
                      <th>Title & Authors</th>
                      <th>Edition</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const cover = product.custom_cover_url || product.cover_image;
                      let statusClass = styles.statusInStock;
                      if (product.status === 'LOW_STOCK') statusClass = styles.statusLowStock;
                      if (product.status === 'OUT_OF_STOCK') statusClass = styles.statusOutOfStock;
                      if (product.status === 'DISCONTINUED') statusClass = styles.statusDiscontinued;

                      return (
                        <tr key={product.id} data-testid={`manager-row-${product.id}`}>
                          <td>
                            {cover ? (
                              <img
                                src={cover}
                                alt={product.title}
                                className={styles.productThumb}
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className={styles.productThumb}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.25rem',
                                }}
                              >
                                📖
                              </div>
                            )}
                          </td>
                          <td>
                            <div className={styles.bookInfoGroup}>
                              <span className={styles.bookTitleText}>{product.title}</span>
                              <span className={styles.bookAuthorText}>
                                {product.authors.join(', ') || 'Unknown Author'}
                              </span>
                            </div>
                          </td>
                          <td style={{ color: '#4b5563' }}>
                            {product.edition || 'Standard Edition'}
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            ${product.price}
                          </td>
                          <td>
                            <div className={styles.stockControls}>
                              <button
                                type="button"
                                onClick={() => handleQuickStockChange(product.id, product.quantity, -1)}
                                className={styles.stockBtn}
                                title="Decrease stock by 1"
                              >
                                -
                              </button>
                              <span style={{ minWidth: '1.5rem', textAlign: 'center', fontWeight: 700 }}>
                                {product.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickStockChange(product.id, product.quantity, 1)}
                                className={styles.stockBtn}
                                title="Increase stock by 1"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${statusClass}`}>
                              {product.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setDrawerStep(1);
                                  setIsDrawerOpen(true);
                                }}
                                className={styles.editButton}
                                data-testid={`edit-product-${product.id}`}
                                title="Edit Card Presentation & Product Info"
                              >
                                Edit Card
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setDrawerStep(2);
                                  setIsDrawerOpen(true);
                                }}
                                className={styles.editButton}
                                style={{
                                  backgroundColor: '#EEF2FF',
                                  color: '#4F46E5',
                                  borderColor: '#C7D2FE',
                                }}
                                data-testid={`edit-bdp-${product.id}`}
                                title="Edit Book Detail Page (BDP) Editorial Content"
                              >
                                Edit BDP
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Tab 2: Inventory Stock Adjustment Matrix ── */}
        {activeTab === 'inventory' && (
          <div className={styles.tableContainer}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Quick Stock Adjustment</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>Adjust stock levels with instant real-time synchronization.</p>
              </div>
              <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                Total Managed Items: <strong>{products.length}</strong>
              </span>
            </div>
            <table className={styles.productsTable}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Current Stock</th>
                  <th>Reserved Units</th>
                  <th>Available Units</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Adjust Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ display: 'block' }}>{p.title}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{p.edition}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{p.quantity}</td>
                    <td style={{ color: '#6b7280' }}>{p.reserved_quantity}</td>
                    <td style={{ fontWeight: 700, color: (p.available_quantity ?? p.quantity) > 0 ? '#15803d' : '#dc2626' }}>
                      {p.available_quantity ?? p.quantity}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${p.status === 'IN_STOCK' ? styles.statusInStock : styles.statusOutOfStock}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => handleQuickStockChange(p.id, p.quantity, -5)}
                          className={styles.stockBtn}
                          style={{ width: 'auto', padding: '0 0.5rem', borderRadius: '0.5rem' }}
                          title="Reduce 5 units"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStockChange(p.id, p.quantity, -1)}
                          className={styles.stockBtn}
                          title="Reduce 1 unit"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStockChange(p.id, p.quantity, 1)}
                          className={styles.stockBtn}
                          title="Add 1 unit"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStockChange(p.id, p.quantity, 5)}
                          className={styles.stockBtn}
                          style={{ width: 'auto', padding: '0 0.5rem', borderRadius: '0.5rem' }}
                          title="Add 5 units"
                        >
                          +5
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab 3: Revenue & Sales Breakdown ── */}
        {activeTab === 'revenue' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className={styles.revenueSummaryCards}>
              <div className={styles.revenueCard}>
                <span className={styles.metricLabel}>Completed Sales Orders</span>
                <span className={styles.revenueValue} style={{ color: '#2563eb' }}>
                  {revenueData?.total_completed_orders ?? 0}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Orders verified across your curated books
                </span>
              </div>
              <div className={styles.revenueCard}>
                <span className={styles.metricLabel}>Gross Sales Revenue</span>
                <span className={styles.revenueValue}>
                  {revenueData?.gross_revenue ?? '$0.00'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Total gross earnings from completed checkout
                </span>
              </div>
              <div className={styles.revenueCard}>
                <span className={styles.metricLabel}>Current Inventory Value</span>
                <span className={styles.revenueValue} style={{ color: '#7c3aed' }}>
                  {revenueData?.total_inventory_value ?? '$0.00'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Asset value of on-hand inventory units
                </span>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                  Book-by-Book Revenue Performance
                </h3>
              </div>
              <table className={styles.productsTable}>
                <thead>
                  <tr>
                    <th>Book Title & Edition</th>
                    <th>Price</th>
                    <th>Stock Units</th>
                    <th>Inventory Asset Value</th>
                    <th>Units Sold</th>
                    <th style={{ textAlign: 'right' }}>Revenue Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {(revenueData?.books || []).map((bk) => (
                    <tr key={bk.id}>
                      <td>
                        <strong>{bk.title}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{bk.edition}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>${bk.price}</td>
                      <td>{bk.quantity}</td>
                      <td style={{ color: '#4b5563' }}>${bk.inventory_value}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                          <TrendingUp size={14} color="#16a34a" />
                          {bk.units_sold}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                        ${bk.gross_revenue}
                      </td>
                    </tr>
                  ))}
                  {(!revenueData?.books || revenueData.books.length === 0) && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                        No published titles with sales records yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Product Creation & Editing Drawer */}
      <StoreProductDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
        initialStep={drawerStep}
        onSaveProduct={handleSaveProduct}
      />
    </div>
  );
}
export default StoreManagerPage;
