import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookDetailPage } from './BookDetailPage';
import * as storeService from '@/services/storeService';
import type { StoreProductItem } from '@/pages/Store/types/store';

// Mock GSAP and ScrollTrigger
vi.mock('gsap', () => {
  const gsapMock = {
    set: vi.fn(),
    to: vi.fn(),
    fromTo: vi.fn(),
    killTweensOf: vi.fn(),
    registerPlugin: vi.fn(),
  };
  return {
    gsap: gsapMock,
    default: gsapMock,
  };
});

const MOCK_BDP_PRODUCT: StoreProductItem = {
  id: 'prod-bones-of-jade',
  book_reference: 'book-bones',
  title: 'Bones of Jade, Flesh like Ice',
  authors: ['Gracie Marsden'],
  cover_image: 'https://images.akashic.org/bones-cover.jpg',
  description: 'A dark journey in historical fantasy inspired by Taiwanese myth.',
  genres: ['Fantasy', 'Historical', 'Buzzy New Release'],
  price: '19.99',
  original_price: '27.00',
  is_discounted: true,
  discount_percentage: 26,
  status: 'IN_STOCK',
  quantity: 10,
  reserved_quantity: 0,
  available_quantity: 10,
  card_customization: {
    background_color: '#d97706',
    title_color: '#ffffff',
  },
  detail: {
    original_price: '27.00',
    hero_theme: { background_color: '#fef3c7', wave_color: '#fed7aa', accent_color: '#d97706' },
    at_a_glance: [
      { icon: '👋', label: 'Debut Novel', bg_color: '#00d2d3', text_color: '#ffffff' },
      { icon: '🔮', label: 'Taiwanese folklore', bg_color: '#ff4757', text_color: '#ffffff' },
      { icon: '🗡️', label: 'Tale of vengeance', bg_color: '#5f27cd', text_color: '#ffffff' },
      { icon: '📖', label: 'Reads like a fable', bg_color: '#10ac84', text_color: '#ffffff' },
    ],
    synopsis: 'A young woman makes a bargain with a shapeshifting demon who promises her power if she will give up love.',
    full_description: 'An ancient court holds secrets darker than obsidian. When our protagonist uncovers the truth, only vengeance can wash clean the sins of the empire.\n\nCritically acclaimed for its sumptuous world-building and unforgettable characters.',
    editorial_cards: [
      {
        quote: 'A triumphant and spellbinding tale of mythology and courage.',
        attribution: 'Shelley Parker-Chan',
        publication: 'New York Times Bestseller',
      },
      {
        quote: 'Gracie Marsden crafts a mythic masterpiece steeped in Taiwanese folklore.',
        attribution: 'Literary Hub',
        publication: 'Fall Fiction Review',
      },
    ],
    excerpt: 'The demon did not come in fire or shadow; it stepped across the wooden threshold wearing the face of her dead sister, smiling with teeth as white and sharp as river jade.',
    why_we_chose: 'We fell head over heels for the atmospheric folklore and the bold, uncompromising female protagonist.',
    content_warnings: ['Contains graphic descriptions of mythic warfare and emotional abuse.'],
  },
};

const MOCK_SIMILAR_PRODUCTS: StoreProductItem[] = [
  MOCK_BDP_PRODUCT,
  {
    id: 'prod-monsters',
    book_reference: 'book-monsters',
    title: 'Monsters of Ohio',
    authors: ['John Scalzi'],
    cover_image: 'https://images.akashic.org/monsters.jpg',
    description: 'A tentacular solution to modern problems.',
    genres: ['Science Fiction', 'Satire'],
    price: '24.99',
    status: 'IN_STOCK',
    quantity: 5,
    reserved_quantity: 0,
    available_quantity: 5,
  },
];

describe('BookDetailPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.scrollTo = vi.fn();
    }
    vi.spyOn(storeService, 'getStoreProduct').mockResolvedValue(MOCK_BDP_PRODUCT);
    vi.spyOn(storeService, 'getStoreProducts').mockResolvedValue(MOCK_SIMILAR_PRODUCTS);
    vi.spyOn(storeService, 'addToBox').mockResolvedValue({
      success: true,
      cart_count: 1,
      item_quantity: 1,
      message: 'Item added to box',
    });
  });

  it('renders hero with author, oversized title, and genre badges', async () => {
    render(<BookDetailPage initialProductId="prod-bones-of-jade" />);

    const hero = await screen.findByTestId('book-detail-hero');
    expect(within(hero).getByRole('heading', { level: 1, name: /Bones of Jade, Flesh like Ice/i })).toBeInTheDocument();
    expect(within(hero).getByText('Gracie Marsden')).toBeInTheDocument();
    expect(within(hero).getByText('Buzzy New Release')).toBeInTheDocument();
    expect(within(hero).getByText('Fantasy')).toBeInTheDocument();
    expect(within(hero).getByText('Historical')).toBeInTheDocument();
  });

  it('renders 3D central book cover with proper image source', async () => {
    render(<BookDetailPage initialProductId="prod-bones-of-jade" />);

    const coverImg = await screen.findByAltText('Cover artwork of Bones of Jade, Flesh like Ice');
    expect(coverImg).toBeInTheDocument();
    expect(coverImg).toHaveAttribute('src', 'https://images.akashic.org/bones-cover.jpg');
  });

  it('renders "At a glance" handwritten section with tags', async () => {
    render(<BookDetailPage initialProductId="prod-bones-of-jade" />);

    expect(await screen.findByText('At a glance')).toBeInTheDocument();
    expect(screen.getByText('Debut Novel')).toBeInTheDocument();
    expect(screen.getByText('Taiwanese folklore')).toBeInTheDocument();
    expect(screen.getByText('Tale of vengeance')).toBeInTheDocument();
    expect(screen.getByText('Reads like a fable')).toBeInTheDocument();
  });

  it('renders Degular reading synopsis and complete multi-paragraph description', async () => {
    render(<BookDetailPage initialProductId="prod-bones-of-jade" />);

    expect(
      await screen.findByText(/A young woman makes a bargain with a shapeshifting demon/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/An ancient court holds secrets darker than obsidian/i)
    ).toBeInTheDocument();
  });

  it('renders editorial proof callout cards', async () => {
    render(<BookDetailPage initialProductId="prod-bones-of-jade" />);

    expect(await screen.findByText("Don't just take our word for it")).toBeInTheDocument();
    expect(
      screen.getByText(/A triumphant and spellbinding tale of mythology and courage/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Shelley Parker-Chan/i)).toBeInTheDocument();
  });

  it('renders "Get a taste" sample excerpt reading card', async () => {
    render(<BookDetailPage initialProductId="prod-bones-of-jade" />);

    expect(await screen.findByText('Get a taste')).toBeInTheDocument();
    expect(
      screen.getByText(/The demon did not come in fire or shadow/i)
    ).toBeInTheDocument();
  });

  it('renders Book Notes accordions and toggles their expanded state', async () => {
    render(<BookDetailPage initialProductId="prod-bones-of-jade" />);

    expect(await screen.findByText('Book notes')).toBeInTheDocument();

    const whyTrigger = screen.getByText(/Why we chose/i);
    expect(whyTrigger).toBeInTheDocument();

    const warningsTrigger = screen.getByText(/Content warnings/i);
    expect(warningsTrigger).toBeInTheDocument();
    expect(
      screen.getByText(/Contains graphic descriptions of mythic warfare/i)
    ).toBeInTheDocument();
  });

  it('renders Similar Titles carousel excluding current product', async () => {
    const onSelectBookMock = vi.fn();
    render(
      <BookDetailPage
        initialProductId="prod-bones-of-jade"
        onSelectBook={onSelectBookMock}
      />
    );

    expect(await screen.findByText('Similar titles')).toBeInTheDocument();
    // Monsters of Ohio should be visible in similar carousel
    expect(screen.getByText('Monsters of Ohio')).toBeInTheDocument();
  });

  it('renders floating persistent Add-to-Box CTA and triggers shopping bag addition', async () => {
    render(<BookDetailPage initialProductId="prod-bones-of-jade" />);

    const addToBoxBtn = await screen.findByTestId('add-to-box-btn');
    expect(addToBoxBtn).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('$27.00')).toBeInTheDocument();

    fireEvent.click(addToBoxBtn);

    await waitFor(() => {
      expect(storeService.addToBox).toHaveBeenCalledWith('prod-bones-of-jade', 1);
    });
  });

  it('renders missing product state when no ID is provided, without defaulting to first book', async () => {
    render(<BookDetailPage productId="" />);

    expect(await screen.findByText('No Book Selected')).toBeInTheDocument();
    expect(
      screen.getByText(/No product selected. Please choose an edition from the Akashic Store catalogue./i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to All Books/i })).toBeInTheDocument();
    // Must NOT have called getStoreProduct or fallen back to any default book
    expect(storeService.getStoreProduct).not.toHaveBeenCalled();
  });

  it('supports sample_excerpt alias in product detail payload', async () => {
    const productWithSampleExcerpt: StoreProductItem = {
      ...MOCK_BDP_PRODUCT,
      id: 'prod-sample-alias',
      title: 'Alias Test Edition',
      detail: {
        ...MOCK_BDP_PRODUCT.detail!,
        excerpt: '',
        sample_excerpt: 'This is the sample excerpt passed via the sample_excerpt field contract.',
      },
    };
    vi.spyOn(storeService, 'getStoreProduct').mockResolvedValueOnce(productWithSampleExcerpt);

    render(<BookDetailPage productId="prod-sample-alias" />);

    expect(await screen.findByText('Get a taste')).toBeInTheDocument();
    expect(
      screen.getByText('This is the sample excerpt passed via the sample_excerpt field contract.')
    ).toBeInTheDocument();
  });

  it('omits Content Warnings accordion when content_warnings is empty', async () => {
    const productWithoutWarnings: StoreProductItem = {
      ...MOCK_BDP_PRODUCT,
      id: 'prod-no-warnings',
      detail: {
        ...MOCK_BDP_PRODUCT.detail!,
        content_warnings: [],
      },
    };
    vi.spyOn(storeService, 'getStoreProduct').mockResolvedValueOnce(productWithoutWarnings);

    render(<BookDetailPage productId="prod-no-warnings" />);

    expect(await screen.findByText('Book notes')).toBeInTheDocument();
    expect(screen.getByText(/Why we chose/i)).toBeInTheDocument();
    expect(screen.queryByText(/Content warnings/i)).not.toBeInTheDocument();
  });

  it('switches product when productId prop changes', async () => {
    const productTwo: StoreProductItem = {
      ...MOCK_BDP_PRODUCT,
      id: 'prod-two',
      title: 'Second Selected Novel',
    };

    vi.spyOn(storeService, 'getStoreProduct').mockImplementation(async (id: string) => {
      if (id === 'prod-two') return productTwo;
      return MOCK_BDP_PRODUCT;
    });

    const { rerender } = render(<BookDetailPage productId="prod-bones-of-jade" />);
    const heading1 = await screen.findByRole('heading', { level: 1 });
    expect(heading1.textContent).toContain('Bones');
    expect(heading1.textContent).toContain('Ice');

    rerender(<BookDetailPage productId="prod-two" />);
    await waitFor(() => {
      const heading2 = screen.getByRole('heading', { level: 1 });
      expect(heading2.textContent).toContain('Second');
    });
  });
});
