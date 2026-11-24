export interface CommonQuestionItem {
  id: string;
  question: string;
  answer: string;
}

export interface CommonQuestionsSectionProps {
  className?: string;
  onNavigateFaq?: () => void;
  onBecomeMemberClick?: () => void;
}

export interface CommonQuestionsAccordionProps {
  items: CommonQuestionItem[];
  openIds: Set<string>;
  onToggle: (id: string) => void;
}
