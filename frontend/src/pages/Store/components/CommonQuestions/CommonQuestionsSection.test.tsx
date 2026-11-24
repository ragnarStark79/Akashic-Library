import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommonQuestionsSection } from './CommonQuestionsSection';
import { COMMON_QUESTIONS } from './data/commonQuestionsData';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('CommonQuestionsSection Component', () => {
  it('renders section title and initial 5 common questions', () => {
    render(<CommonQuestionsSection />);

    expect(
      screen.getByRole('heading', { level: 2, name: /common questions/i })
    ).toBeInTheDocument();

    // Verify first 5 questions are rendered initially
    COMMON_QUESTIONS.slice(0, 5).forEach((q) => {
      expect(screen.getByText(q.question)).toBeInTheDocument();
    });

    // 6th question should not be visible before clicking Show all
    expect(screen.queryByText(COMMON_QUESTIONS[5]!.question)).not.toBeInTheDocument();
  });

  it('toggles accordion items and manages aria-expanded state', () => {
    render(<CommonQuestionsSection />);

    const firstQuestion = COMMON_QUESTIONS[0]!;
    const firstBtn = screen.getByTestId(`common-question-btn-${firstQuestion.id}`);

    // First question is open by default
    expect(firstBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(firstQuestion.answer)).toBeInTheDocument();

    // Click to close first question
    fireEvent.click(firstBtn);
    expect(firstBtn).toHaveAttribute('aria-expanded', 'false');

    // Click to open second question
    const secondQuestion = COMMON_QUESTIONS[1]!;
    const secondBtn = screen.getByTestId(`common-question-btn-${secondQuestion.id}`);
    expect(secondBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(secondBtn);
    expect(secondBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(secondQuestion.answer)).toBeInTheDocument();
  });

  it('expands all 8 questions when "Show all FAQ" is clicked, and collapses on toggle', () => {
    const onNavigateMock = vi.fn();
    render(<CommonQuestionsSection onNavigateFaq={onNavigateMock} />);

    const showAllBtn = screen.getByTestId('show-all-faq-button');
    expect(showAllBtn).toHaveTextContent(/show all faq/i);

    fireEvent.click(showAllBtn);
    expect(onNavigateMock).toHaveBeenCalledTimes(1);

    // Now all 8 questions should be rendered
    COMMON_QUESTIONS.forEach((q) => {
      expect(screen.getByText(q.question)).toBeInTheDocument();
    });
    expect(showAllBtn).toHaveTextContent(/show less/i);

    // Clicking again collapses back to initial 5
    fireEvent.click(showAllBtn);
    expect(screen.queryByText(COMMON_QUESTIONS[5]!.question)).not.toBeInTheDocument();
  });

  it('renders organic background SVGs and brand seal logo easter-egg', () => {
    const { container } = render(<CommonQuestionsSection />);

    const bg = screen.getByTestId('common-questions-bg');
    expect(bg).toBeInTheDocument();
    const svgs = bg.querySelectorAll('svg');
    expect(svgs.length).toBe(2); // desktop + mobile

    const easterEgg = container.querySelector('[data-testid="faq-logo-easter-egg"]');
    expect(easterEgg).toBeInTheDocument();
  });

  it('supports keyboard accessibility with focus visible and proper roles', () => {
    render(<CommonQuestionsSection />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(6); // 5 FAQ items + 1 Show All CTA

    const firstBtn = screen.getByTestId(`common-question-btn-${COMMON_QUESTIONS[0]!.id}`);
    expect(firstBtn).toHaveAttribute('aria-controls', `faq-answer-${COMMON_QUESTIONS[0]!.id}`);
  });
});
