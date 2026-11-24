import { useState, useEffect } from 'react';
import type {
  StoreProductItem,
  StoreProductCreatePayload,
  StoreProductUpdatePayload,
  CardCustomization,
  OpenLibraryImportPreview,
  StoreProductStatus,
  AtAGlanceTag,
  EditorialProofCard,
  StoreProductDetailContent,
} from '@/pages/Store/types/store';
import { previewOpenLibraryImport } from '@/services/storeService';
import { BookCard } from '@/pages/Store/components/StoreBooksSection/components/BookCard';
import styles from './StoreProductDrawer.module.css';

export interface StoreProductDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: StoreProductItem | null;
  initialStep?: 1 | 2;
  onSaveProduct: (
    payload: StoreProductCreatePayload | StoreProductUpdatePayload,
    isEdit: boolean,
    detailPayload?: StoreProductDetailContent
  ) => Promise<void>;
}

const PRESET_BG_COLORS = [
  '#2a080c', '#111827', '#1e293b', '#3b6e8c', '#78350f',
  '#b91c1c', '#064e3b', '#a3e635', '#0f766e', '#e2d9f3',
  '#334155', '#18181b', '#831843', '#4a044e', '#1e3a5f',
  '#14532d', '#eab308', '#ff385c', '#3d3195', '#ff008f',
];

const PRESET_TITLE_COLORS = [
  '#ffffff', '#fef3c7', '#38bdf8', '#a7f3d0', '#ccfbf1',
  '#2e1065', '#f59e0b', '#000000', '#111827',
];

const PRESET_HERO_BG_COLORS = [
  '#FEE6D0', '#FCE7F3', '#E0F2FE', '#EDE9FE', '#FEF08A',
  '#DCFCE7', '#FFEDD5', '#F3F4F6', '#FFE4E6', '#E2E8F0',
];

const PRESET_HERO_TITLE_COLORS = [
  '#111827', '#000000', '#ffffff', '#fffdf9', '#fef3c7',
  '#38bdf8', '#ff007a', '#71002e', '#2e1065', '#064e3b',
];

function getSuggestedTitleColor(hexColor: string): string {
  const clean = (hexColor || '').replace('#', '');
  const hex = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#111827';
  const chan = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  return lum > 0.4 ? '#111827' : '#FFFFFF';
}

export function StoreProductDrawer({
  isOpen,
  onClose,
  productToEdit,
  initialStep = 1,
  onSaveProduct,
}: StoreProductDrawerProps) {
  const isEdit = Boolean(productToEdit);

  // Workflow Step: 1 (Product & Card) vs 2 (Detail Page Content)
  const [workflowStep, setWorkflowStep] = useState<1 | 2>(initialStep);

  // Preview Mode: 'card' vs 'bdp'
  const [previewMode, setPreviewMode] = useState<'card' | 'bdp'>('card');

  // Tab: 'open_library' vs 'manual'
  const [activeTab, setActiveTab] = useState<'open_library' | 'manual'>('open_library');

  // Open Library import state
  const [olUrl, setOlUrl] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<OpenLibraryImportPreview | null>(null);

  // ── Step 1 Form Fields ──
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [description, setDescription] = useState('');
  const [genres, setGenres] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isbn, setIsbn] = useState('');
  const [edition, setEdition] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('24.00');
  const [quantity, setQuantity] = useState(20);
  const [status, setStatus] = useState<StoreProductStatus>('IN_STOCK');

  // Step 1 Customization
  const [bgColor, setBgColor] = useState('#111827');
  const [titleColor, setTitleColor] = useState('#ffffff');
  const [descColor, setDescColor] = useState('#e2e8f0');
  const [badgeColors, setBadgeColors] = useState<Record<string, string>>({});

  // ── Step 2 BDP Editorial Fields ──
  const [heroBgColor, setHeroBgColor] = useState('#FEE6D0');
  const [heroWaveColor, setHeroWaveColor] = useState('#F9A220');
  const [heroTitleColor, setHeroTitleColor] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [whyWeChose, setWhyWeChose] = useState('');
  const [contentWarnings, setContentWarnings] = useState<string[]>([]);
  const [newWarningInput, setNewWarningInput] = useState('');

  // At A Glance Tags (4 tags)
  const [atAGlance, setAtAGlance] = useState<AtAGlanceTag[]>([
    { icon: '🪄', label: 'Curated Staff Pick', bg_color: '#ff008f', text_color: '#ffffff' },
    { icon: '📜', label: 'Exquisite Prose', bg_color: '#a855f7', text_color: '#ffffff' },
    { icon: '⚔️', label: 'Immersive World', bg_color: '#00e500', text_color: '#000000' },
    { icon: '🧙', label: 'Collector Edition', bg_color: '#3b82f6', text_color: '#ffffff' },
  ]);

  // Editorial Proof Cards (Up to 4)
  const [editorialCards, setEditorialCards] = useState<EditorialProofCard[]>([
    {
      heading: 'An unforgettable story',
      quote: 'A magnificent achievement in contemporary literary storytelling that resonates across generations.',
      attribution: 'Akashic Literary Review',
      publication: 'Featured Review',
      bg_color: '#FDF8D2',
      text_color: '#1c1917',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Populate fields when editing or resetting
  useEffect(() => {
    setWorkflowStep(initialStep || 1);
    setPreviewMode(initialStep === 2 ? 'bdp' : 'card');

    if (productToEdit) {
      setTitle(productToEdit.title || '');
      setAuthors(productToEdit.authors ? productToEdit.authors.join(', ') : '');
      setDescription(productToEdit.custom_description || productToEdit.description || '');
      setGenres(productToEdit.custom_genres?.join(', ') || productToEdit.genres?.join(', ') || '');
      setCoverUrl(productToEdit.custom_cover_url || productToEdit.cover_image || '');
      setIsbn(productToEdit.isbn || '');
      setEdition(productToEdit.edition || '');
      setCondition(productToEdit.condition || '');
      setPrice(productToEdit.price || '24.00');
      setQuantity(productToEdit.quantity || 0);
      setStatus(productToEdit.status || 'IN_STOCK');

      const custom = productToEdit.card_customization || {};
      setBgColor(custom.background_color || '#111827');
      setTitleColor(custom.title_color || '#ffffff');
      setDescColor(custom.description_color || '#e2e8f0');
      setBadgeColors(custom.genre_badge_colors || {});

      // Detail fields
      const d = productToEdit.detail;
      setHeroBgColor(d?.hero_theme?.background_color || '#FEE6D0');
      setHeroWaveColor(d?.hero_theme?.wave_color || '#F9A220');
      setHeroTitleColor(d?.hero_theme?.title_color || d?.hero_title_color || '');
      setOriginalPrice(d?.original_price ? String(d.original_price) : '');
      setSynopsis(d?.synopsis || productToEdit.custom_description || productToEdit.description || '');
      setFullDescription(d?.full_description || productToEdit.description || '');
      setExcerpt(d?.sample_excerpt || d?.excerpt || '');
      setWhyWeChose(d?.why_we_chose || '');
      setContentWarnings(Array.isArray(d?.content_warnings) ? d.content_warnings : []);

      if (d?.at_a_glance && d.at_a_glance.length > 0) {
        setAtAGlance(d.at_a_glance);
      } else {
        const pGenres = productToEdit.genres || ['Curated Pick'];
        setAtAGlance([
          { icon: '🪄', label: pGenres[0] || 'Curated', bg_color: '#ff008f', text_color: '#fff' },
          { icon: '📜', label: pGenres[1] || 'Rich Narrative', bg_color: '#a855f7', text_color: '#fff' },
          { icon: '⚔️', label: 'Immersive World', bg_color: '#00e500', text_color: '#000' },
          { icon: '🧙', label: 'Special Edition', bg_color: '#3b82f6', text_color: '#fff' },
        ]);
      }

      if (d?.editorial_cards && d.editorial_cards.length > 0) {
        setEditorialCards(d.editorial_cards);
      }

      setActiveTab('manual');
    } else {
      // Default reset
      setTitle('');
      setAuthors('');
      setDescription('');
      setGenres('Fiction');
      setCoverUrl('');
      setIsbn('');
      setEdition('Curated Hardcover');
      setCondition('New');
      setPrice('24.00');
      setQuantity(20);
      setStatus('IN_STOCK');
      setBgColor('#111827');
      setTitleColor('#ffffff');
      setDescColor('#e2e8f0');
      setBadgeColors({});
      setOlUrl('');
      setPreviewData(null);
      setActiveTab('open_library');
      setHeroBgColor('#FEE6D0');
      setHeroWaveColor('#F9A220');
      setHeroTitleColor('');
      setOriginalPrice('');
      setSynopsis('');
      setFullDescription('');
      setExcerpt('');
      setWhyWeChose('');
      setContentWarnings([]);
      setAtAGlance([
        { icon: '🪄', label: 'Staff Pick', bg_color: '#ff008f', text_color: '#ffffff' },
        { icon: '📜', label: 'Rich Storytelling', bg_color: '#a855f7', text_color: '#ffffff' },
        { icon: '⚔️', label: 'Unforgettable', bg_color: '#00e500', text_color: '#000000' },
        { icon: '🧙', label: 'Deluxe Binding', bg_color: '#3b82f6', text_color: '#ffffff' },
      ]);
    }
    setFormError(null);
  }, [productToEdit, isOpen, initialStep]);

  if (!isOpen) return null;

  // Handle Open Library Preview Fetch
  const handleFetchPreview = async () => {
    if (!olUrl.trim()) {
      setFormError('Please enter an Open Library URL, Work ID, or ISBN.');
      return;
    }
    setIsLoadingPreview(true);
    setFormError(null);
    try {
      const data = await previewOpenLibraryImport(olUrl.trim());
      setPreviewData(data);
      if (data.title) setTitle(data.title);
      if (data.authors) setAuthors(data.authors.join(', '));
      if (data.description) {
        setDescription(data.description);
        setSynopsis(data.description.slice(0, 280));
        setFullDescription(data.description);
      }
      if (data.genres) setGenres(data.genres.slice(0, 4).join(', '));
      if (data.cover_urls && data.cover_urls.length > 0 && data.cover_urls[0]) setCoverUrl(data.cover_urls[0]);
      if (data.isbn13) setIsbn(data.isbn13);
      else if (data.isbn10) setIsbn(data.isbn10);
    } catch (err: any) {
      setFormError(err?.message || 'Could not fetch metadata from Open Library.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Add / Remove warning tags
  const handleAddWarning = () => {
    const trimmed = newWarningInput.trim();
    if (trimmed && !contentWarnings.includes(trimmed)) {
      setContentWarnings((prev) => [...prev, trimmed]);
      setNewWarningInput('');
    }
  };

  const handleRemoveWarning = (idx: number) => {
    setContentWarnings((prev) => prev.filter((_, i) => i !== idx));
  };

  // Add / Remove Editorial Card
  const handleAddEditorialCard = () => {
    if (editorialCards.length >= 4) return;
    setEditorialCards((prev) => [
      ...prev,
      {
        heading: 'Praise for this edition',
        quote: 'A breathtaking read that captivates from the opening chapter.',
        attribution: 'Literary Critic',
        publication: 'Books & Review',
        bg_color: '#FCE7F3',
        text_color: '#1c1917',
      },
    ]);
  };

  const handleRemoveEditorialCard = (idx: number) => {
    setEditorialCards((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Book title is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const parsedGenres = genres
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);

      const cardCustomization: CardCustomization = {
        background_color: bgColor,
        title_color: titleColor,
        description_color: descColor,
        genre_badge_colors: badgeColors,
      };

      // Construct BDP editorial detail content
      const detailPayload: StoreProductDetailContent = {
        original_price: originalPrice.trim() ? parseFloat(originalPrice) : null,
        hero_theme: {
          background_color: heroBgColor,
          wave_color: heroWaveColor,
          title_color: heroTitleColor,
        },
        hero_title_color: heroTitleColor,
        at_a_glance: atAGlance,
        synopsis: synopsis.trim(),
        full_description: fullDescription.trim(),
        editorial_cards: editorialCards,
        excerpt: excerpt.trim(),
        sample_excerpt: excerpt.trim(),
        why_we_chose: whyWeChose.trim(),
        content_warnings: contentWarnings,
      };

      if (isEdit && productToEdit) {
        const updatePayload: StoreProductUpdatePayload = {
          price: parseFloat(price) || 0,
          edition: edition.trim(),
          condition: condition.trim(),
          status,
          custom_cover_url: coverUrl.trim(),
          custom_description: description.trim(),
          custom_genres: parsedGenres,
          card_customization: cardCustomization,
        };
        await onSaveProduct(updatePayload, true, detailPayload);
      } else {
        const createPayload: StoreProductCreatePayload = {
          price: parseFloat(price) || 0,
          edition: edition.trim(),
          condition: condition.trim(),
          status,
          quantity: Number(quantity) || 0,
          custom_cover_url: coverUrl.trim(),
          custom_description: description.trim(),
          custom_genres: parsedGenres,
          card_customization: cardCustomization,
        };

        if (activeTab === 'open_library' && previewData) {
          createPayload.open_library_data = {
            ...previewData,
            title,
            authors: authors.split(',').map((a) => a.trim()).filter(Boolean),
            description,
            genres: parsedGenres,
            cover_urls: coverUrl ? [coverUrl] : previewData.cover_urls,
          };
        } else {
          createPayload.manual_book = {
            title: title.trim(),
            authors: authors.split(',').map((a) => a.trim()).filter(Boolean),
            description: description.trim(),
            genres: parsedGenres,
            cover_url: coverUrl.trim(),
            isbn13: isbn.trim(),
          };
        }
        await onSaveProduct(createPayload, false, detailPayload);
      }
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save product. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live preview item representation for BookCard
  const livePreviewItem = {
    id: productToEdit ? productToEdit.id : 'preview-card',
    slug: 'preview-card',
    title: title || 'Book Title Preview',
    authors: authors ? authors.split(',').map((a) => a.trim()) : ['Author Name'],
    author: authors || 'Author Name',
    description: description || 'Short book synopsis will appear here in the preview...',
    cover_image: coverUrl,
    coverImage: coverUrl,
    genres: genres.split(',').map((g) => g.trim()).filter(Boolean),
    card_customization: {
      background_color: bgColor,
      title_color: titleColor,
      description_color: descColor,
      genre_badge_colors: badgeColors,
    },
    initialRotation: 0,
    initialYOffset: 0,
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.drawerContainer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.drawerHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <h2 className={styles.drawerTitle}>
              {isEdit ? 'Edit Store Product' : 'Add New Book to Store'}
            </h2>

            {/* ── 2-Step Navigation Tabs ── */}
            <div className={styles.stepNav}>
              <button
                type="button"
                className={`${styles.stepNavBtn} ${workflowStep === 1 ? styles.stepNavBtnActive : ''}`}
                onClick={() => {
                  setWorkflowStep(1);
                  setPreviewMode('card');
                }}
                data-testid="step-1-tab"
              >
                <span className={styles.stepBadge}>1</span>
                <span>Product & Card</span>
              </button>
              <button
                type="button"
                className={`${styles.stepNavBtn} ${workflowStep === 2 ? styles.stepNavBtnActive : ''}`}
                onClick={() => {
                  setWorkflowStep(2);
                  setPreviewMode('bdp');
                }}
                data-testid="step-2-tab"
              >
                <span className={styles.stepBadge}>2</span>
                <span>Detail Page Content</span>
              </button>
            </div>
          </div>

          <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close drawer">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.drawerBody}>
          {/* Form Column */}
          <form className={styles.formColumn} onSubmit={handleSubmit}>
            {formError && <div className={styles.errorMessage}>{formError}</div>}

            {/* ══════════════════════════════════════════════════════════
                STEP 1: PRODUCT & UNIVERSAL BOOKCARD CUSTOMIZATION
            ══════════════════════════════════════════════════════════ */}
            {workflowStep === 1 && (
              <>
                {/* Creation Method Tabs (only when adding new product) */}
                {!isEdit && (
                  <div className={styles.methodTabs}>
                    <button
                      type="button"
                      className={`${styles.tabButton} ${activeTab === 'open_library' ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab('open_library')}
                    >
                      Method A: Open Library URL
                    </button>
                    <button
                      type="button"
                      className={`${styles.tabButton} ${activeTab === 'manual' ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab('manual')}
                    >
                      Method B: Manual Entry
                    </button>
                  </div>
                )}

                {/* Method A URL Input */}
                {!isEdit && activeTab === 'open_library' && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor="ol-url-input">
                      Open Library Book or Edition URL
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        id="ol-url-input"
                        type="url"
                        value={olUrl}
                        onChange={(e) => setOlUrl(e.target.value)}
                        placeholder="https://openlibrary.org/works/OL82563W/Frankenstein"
                        className={styles.fieldInput}
                      />
                      <button
                        type="button"
                        onClick={handleFetchPreview}
                        disabled={isLoadingPreview}
                        className={styles.importButton}
                      >
                        {isLoadingPreview ? 'Fetching...' : 'Fetch Metadata'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Bibliographic Info Fields */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="book-title">
                    Book Title
                  </label>
                  <input
                    id="book-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className={styles.fieldInput}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="book-authors">
                    Authors (comma-separated)
                  </label>
                  <input
                    id="book-authors"
                    type="text"
                    value={authors}
                    onChange={(e) => setAuthors(e.target.value)}
                    className={styles.fieldInput}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="book-desc">
                    Short Description
                  </label>
                  <textarea
                    id="book-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className={styles.fieldTextarea}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="book-genres">
                    Genres (comma-separated)
                  </label>
                  <input
                    id="book-genres"
                    type="text"
                    value={genres}
                    onChange={(e) => setGenres(e.target.value)}
                    className={styles.fieldInput}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="book-cover">
                    Custom Cover Artwork URL
                  </label>
                  <input
                    id="book-cover"
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className={styles.fieldInput}
                  />
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor="book-price">
                      Store Price ($) *
                    </label>
                    <input
                      id="book-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      className={styles.fieldInput}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor="book-status">
                      Status
                    </label>
                    <select
                      id="book-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as StoreProductStatus)}
                      className={styles.fieldSelect}
                    >
                      <option value="IN_STOCK">In Stock</option>
                      <option value="LOW_STOCK">Low Stock</option>
                      <option value="OUT_OF_STOCK">Out of Stock</option>
                      <option value="PREORDER">Preorder</option>
                      <option value="DISCONTINUED">Discontinued</option>
                    </select>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor="book-edition">
                      Edition / Format
                    </label>
                    <input
                      id="book-edition"
                      type="text"
                      value={edition}
                      onChange={(e) => setEdition(e.target.value)}
                      className={styles.fieldInput}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor="book-qty">
                      Initial Inventory Units
                    </label>
                    <input
                      id="book-qty"
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                      className={styles.fieldInput}
                    />
                  </div>
                </div>

                {/* ── Universal BookCard Customization Panel ── */}
                <div className={styles.colorPickerSection}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                    Universal BookCard Presentation
                  </h3>

                  {/* Background Color Picker */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Card Background Color ({bgColor})</label>
                    <div className={styles.swatchesRow}>
                      {PRESET_BG_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBgColor(c)}
                          className={`${styles.colorSwatch} ${bgColor === c ? styles.colorSwatchActive : ''}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        style={{ width: '2rem', height: '2rem', padding: 0, border: 'none', cursor: 'pointer' }}
                        title="Custom Color"
                      />
                    </div>
                  </div>

                  {/* Title Color Picker */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Title Text Color</label>
                    <div className={styles.swatchesRow}>
                      {PRESET_TITLE_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTitleColor(c)}
                          className={`${styles.colorSwatch} ${titleColor === c ? styles.colorSwatchActive : ''}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={titleColor}
                        onChange={(e) => setTitleColor(e.target.value)}
                        style={{ width: '2rem', height: '2rem', padding: 0, border: 'none', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  {/* Genre Badge Colors */}
                  {genres && (
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Genre Badge Colors</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {genres.split(',').map((g) => {
                          const gName = g.trim();
                          if (!gName) return null;
                          const currentColor = badgeColors[gName] || '#000000';
                          return (
                            <div key={gName} className={styles.genreBadgeConfig}>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{gName}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span
                                  style={{
                                    width: '1.25rem',
                                    height: '1.25rem',
                                    borderRadius: '50%',
                                    backgroundColor: currentColor,
                                    border: '1px solid #d1d5db',
                                  }}
                                />
                                <input
                                  type="color"
                                  value={currentColor}
                                  onChange={(e) =>
                                    setBadgeColors((prev) => ({
                                      ...prev,
                                      [gName]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className={styles.submitButton}
                    style={{ backgroundColor: '#4F46E5' }}
                    onClick={() => {
                      setWorkflowStep(2);
                      setPreviewMode('bdp');
                    }}
                  >
                    Next: Detail Page Content →
                  </button>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 2: BOOK DETAIL PAGE (BDP) EDITORIAL CONTENT
            ══════════════════════════════════════════════════════════ */}
            {workflowStep === 2 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>
                    Book Detail Page (BDP) Editorial Content
                  </h3>
                  <button
                    type="button"
                    onClick={() => setWorkflowStep(1)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4F46E5',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ← Back to Product Info
                  </button>
                </div>

                {/* Hero Aesthetic Styling */}
                <div className={styles.colorPickerSection}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    1. Hero Aesthetics & Colors
                  </h4>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Hero Background ({heroBgColor})</label>
                    <div className={styles.swatchesRow}>
                      {PRESET_HERO_BG_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setHeroBgColor(c)}
                          className={`${styles.colorSwatch} ${heroBgColor === c ? styles.colorSwatchActive : ''}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={heroBgColor}
                        onChange={(e) => setHeroBgColor(e.target.value)}
                        style={{ width: '2rem', height: '2rem', padding: 0, border: 'none', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Hero Wave Color ({heroWaveColor})</label>
                    <input
                      type="color"
                      value={heroWaveColor}
                      onChange={(e) => setHeroWaveColor(e.target.value)}
                      style={{ width: '2rem', height: '2rem', padding: 0, border: 'none', cursor: 'pointer' }}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className={styles.fieldLabel}>
                        Book Detail Hero Title Text Colour ({heroTitleColor || `Auto: ${getSuggestedTitleColor(heroBgColor)}`})
                      </label>
                      <button
                        type="button"
                        onClick={() => setHeroTitleColor(getSuggestedTitleColor(heroBgColor))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#4F46E5',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Auto-Contrast
                      </button>
                    </div>
                    <div className={styles.swatchesRow}>
                      <button
                        type="button"
                        onClick={() => setHeroTitleColor('')}
                        className={`${styles.colorSwatch} ${!heroTitleColor ? styles.colorSwatchActive : ''}`}
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                        title="Auto contrast based on background"
                      >
                        Auto
                      </button>
                      {PRESET_HERO_TITLE_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setHeroTitleColor(c)}
                          className={`${styles.colorSwatch} ${heroTitleColor.toLowerCase() === c.toLowerCase() ? styles.colorSwatchActive : ''}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={heroTitleColor || getSuggestedTitleColor(heroBgColor)}
                        onChange={(e) => setHeroTitleColor(e.target.value)}
                        style={{ width: '2rem', height: '2rem', padding: 0, border: 'none', cursor: 'pointer' }}
                        title="Custom hero title color"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing & Strikethrough Discount */}
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor="orig-price">
                      Original Price (for Strikethrough Discount, optional)
                    </label>
                    <input
                      id="orig-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      placeholder="e.g. 32.00"
                      className={styles.fieldInput}
                    />
                  </div>
                  {originalPrice && parseFloat(originalPrice) > parseFloat(price) && (
                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                      <span className={styles.stepBadge} style={{ width: 'auto', padding: '0.4rem 0.8rem', background: '#FF007A', color: '#fff' }}>
                        {Math.round(((parseFloat(originalPrice) - parseFloat(price)) / parseFloat(originalPrice)) * 100)}% DISCOUNT
                      </span>
                    </div>
                  )}
                </div>

                {/* At A Glance Highlights */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    2. At a Glance Highlights (Diamond / Kite Grid, exactly 4 tags)
                  </label>
                  {atAGlance.map((tag, idx) => (
                    <div key={idx} className={styles.tagRow}>
                      <input
                        type="text"
                        value={tag.icon}
                        onChange={(e) => {
                          const updated = [...atAGlance];
                          updated[idx] = { ...tag, icon: e.target.value };
                          setAtAGlance(updated);
                        }}
                        style={{ width: '3.5rem', textAlign: 'center', fontSize: '1.25rem' }}
                        className={styles.fieldInput}
                        title="Emoji Icon"
                      />
                      <input
                        type="text"
                        value={tag.label}
                        onChange={(e) => {
                          const updated = [...atAGlance];
                          updated[idx] = { ...tag, label: e.target.value };
                          setAtAGlance(updated);
                        }}
                        placeholder={`Tag ${idx + 1}`}
                        className={styles.fieldInput}
                      />
                      <input
                        type="color"
                        value={tag.bg_color || '#000000'}
                        onChange={(e) => {
                          const updated = [...atAGlance];
                          updated[idx] = { ...tag, bg_color: e.target.value };
                          setAtAGlance(updated);
                        }}
                        title="Tag Pill Color"
                        style={{ width: '2rem', height: '2rem', padding: 0, border: 'none', cursor: 'pointer' }}
                      />
                    </div>
                  ))}
                </div>

                {/* Degular Reading Synopsis */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="bdp-synopsis">
                    3. Degular Reading Synopsis (Prominent Display Paragraph)
                  </label>
                  <textarea
                    id="bdp-synopsis"
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    rows={3}
                    placeholder="A young woman makes a bargain with a shapeshifting demon..."
                    className={styles.fieldTextarea}
                  />
                </div>

                {/* Multi-Paragraph Full Description */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="bdp-full-desc">
                    4. Complete Description (Rendered in 2 Columns on Desktop)
                  </label>
                  <textarea
                    id="bdp-full-desc"
                    value={fullDescription}
                    onChange={(e) => setFullDescription(e.target.value)}
                    rows={6}
                    placeholder="Multi-paragraph detailed book description..."
                    className={styles.fieldTextarea}
                  />
                </div>

                {/* Editorial Proof Cards */}
                <div className={styles.fieldGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.fieldLabel}>
                      5. &quot;Don&apos;t Just Take Our Word For It&quot; Proof Cards (Max 4)
                    </label>
                    {editorialCards.length < 4 && (
                      <button
                        type="button"
                        onClick={handleAddEditorialCard}
                        style={{ background: 'none', border: 'none', color: '#4F46E5', fontWeight: 700, cursor: 'pointer' }}
                      >
                        + Add Card
                      </button>
                    )}
                  </div>
                  {editorialCards.map((card, idx) => (
                    <div key={idx} className={styles.cardSlot}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>Proof Card #{idx + 1}</strong>
                        {editorialCards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditorialCard(idx)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <textarea
                        value={card.quote}
                        onChange={(e) => {
                          const updated = [...editorialCards];
                          updated[idx] = { ...card, quote: e.target.value };
                          setEditorialCards(updated);
                        }}
                        rows={2}
                        placeholder="Quote content..."
                        className={styles.fieldTextarea}
                      />
                      <div className={styles.fieldRow}>
                        <input
                          type="text"
                          value={card.attribution || ''}
                          onChange={(e) => {
                            const updated = [...editorialCards];
                            updated[idx] = { ...card, attribution: e.target.value };
                            setEditorialCards(updated);
                          }}
                          placeholder="Attribution / Author"
                          className={styles.fieldInput}
                        />
                        <input
                          type="text"
                          value={card.publication || ''}
                          onChange={(e) => {
                            const updated = [...editorialCards];
                            updated[idx] = { ...card, publication: e.target.value };
                            setEditorialCards(updated);
                          }}
                          placeholder="Publication / Source"
                          className={styles.fieldInput}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reading Excerpt ("Get a taste") */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="bdp-excerpt">
                    6. &quot;Get a Taste&quot; Reading Passage / Sample Excerpt
                  </label>
                  <textarea
                    id="bdp-excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    rows={5}
                    placeholder="The first time Yu'er saw a jing, she was fourteen years old..."
                    className={styles.fieldTextarea}
                  />
                </div>

                {/* Book Notes */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="bdp-why">
                    7. Book Notes: &quot;Why We Chose&quot; Accordion Content
                  </label>
                  <textarea
                    id="bdp-why"
                    value={whyWeChose}
                    onChange={(e) => setWhyWeChose(e.target.value)}
                    rows={3}
                    placeholder="In one of the most creative takes on a Cinderella story..."
                    className={styles.fieldTextarea}
                  />
                </div>

                {/* Content Warnings */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    8. Content Warnings
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={newWarningInput}
                      onChange={(e) => setNewWarningInput(e.target.value)}
                      placeholder="e.g. Bereavement, Violence"
                      className={styles.fieldInput}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddWarning();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddWarning}
                      className={styles.importButton}
                    >
                      Add Tag
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {contentWarnings.map((warning, idx) => (
                      <span
                        key={idx}
                        className={styles.stepBadge}
                        style={{
                          width: 'auto',
                          padding: '0.25rem 0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#fef08a',
                          color: '#854d0e',
                        }}
                      >
                        {warning}
                        <button
                          type="button"
                          onClick={() => handleRemoveWarning(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#854d0e', fontWeight: 800 }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Footer Buttons */}
            <div className={styles.drawerFooter}>
              <button type="button" onClick={onClose} className={styles.cancelButton}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.submitButton}
                data-testid="save-product-button"
              >
                {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>

          {/* ══════════════════════════════════════════════════════════
              PREVIEW COLUMN (Universal BookCard or Live BDP View)
          ══════════════════════════════════════════════════════════ */}
          <div className={styles.previewColumn} data-testid="live-card-preview-panel">
            <div className={styles.previewHeader}>
              <h4 className={styles.previewTitle}>Live Preview</h4>
              <p className={styles.previewSubtitle}>Real-time representation across store surfaces</p>

              {/* Mode switch */}
              <div className={styles.previewModeSwitch}>
                <button
                  type="button"
                  className={`${styles.previewModeBtn} ${previewMode === 'card' ? styles.previewModeBtnActive : ''}`}
                  onClick={() => setPreviewMode('card')}
                >
                  Universal Card
                </button>
                <button
                  type="button"
                  className={`${styles.previewModeBtn} ${previewMode === 'bdp' ? styles.previewModeBtnActive : ''}`}
                  onClick={() => setPreviewMode('bdp')}
                >
                  Detail Page (BDP)
                </button>
              </div>
            </div>

            {previewMode === 'card' ? (
              <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                <BookCard item={livePreviewItem} />
              </ul>
            ) : (
              <div className={styles.miniBdpPreview}>
                {/* Mini BDP Hero */}
                <div
                  style={{
                    backgroundColor: heroBgColor,
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    textAlign: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <p style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: heroTitleColor || getSuggestedTitleColor(heroBgColor),
                  }}>
                    {authors || 'Author'}
                  </p>
                  <h3 style={{
                    margin: '0.25rem 0',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: heroTitleColor || getSuggestedTitleColor(heroBgColor),
                  }}>
                    {title || 'Book Title'}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                    {genres.split(',').map((g) => (
                      <span key={g} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '9999px', background: '#00e500', fontWeight: 700 }}>
                        {g.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mini Cover */}
                <div style={{ textAlign: 'center', margin: '-2rem 0 1rem 0' }}>
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={title}
                      style={{ width: '120px', borderRadius: '6px', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}
                    />
                  ) : (
                    <div style={{ width: '120px', height: '180px', margin: '0 auto', background: '#1c1917', borderRadius: '6px' }} />
                  )}
                </div>

                {/* Mini At A Glance */}
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontFamily: 'cursive' }}>At a glance</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                    {atAGlance.map((tag, i) => (
                      <span key={i} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '9999px', background: tag.bg_color || '#ff008f', color: '#fff', fontWeight: 700 }}>
                        {tag.icon} {tag.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mini Synopsis */}
                {synopsis && (
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.75rem' }}>
                    {synopsis}
                  </p>
                )}

                {/* Mini Notes */}
                {whyWeChose && (
                  <div style={{ background: '#fdf8d2', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    <strong>🙋‍♀️ Why we chose</strong>
                    <p style={{ margin: '4px 0 0 0' }}>{whyWeChose}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
