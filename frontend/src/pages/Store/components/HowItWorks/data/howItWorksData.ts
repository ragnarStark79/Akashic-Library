import type { HowItWorksStepItem } from '../types';
import step1Illustration from '../../../assets/images/steps/step-1.webp';
import step2Illustration from '../../../assets/images/steps/step-2.webp';
import step3Illustration from '../../../assets/images/steps/step-3.webp';
import step4Illustration from '../../../assets/images/steps/step-4.webp';

export const HOW_IT_WORKS_STEPS: HowItWorksStepItem[] = [
  {
    id: 'step-1',
    step: 'Step #1',
    title: 'Explore our books',
    description:
      'The first of every month we reveal 6-7 new books. Follow us on socials to keep an eye on any hints we may post.',
    illustration: step1Illustration,
    alt: 'Step 1 Illustration - Explore our books',
    backgroundColor: '#1ce8ed',
    textColor: '#000000',
    variant: 'base',
  },
  {
    id: 'step-2',
    step: 'Step #2',
    title: 'Build your box',
    description:
      "Members can order up to 3 books per box. At least one title must be from the current month's selections.",
    illustration: step2Illustration,
    alt: 'Step 2 Illustration - Build your box',
    backgroundColor: '#fd48f2',
    textColor: '#000000',
    variant: 'bright-pink',
  },
  {
    id: 'step-3',
    step: 'Step #3',
    title: 'Check your doorstep',
    description:
      'Your box is delivered right to your doorstep. This is the best excuse to cancel your Friday night plans.',
    illustration: step3Illustration,
    alt: 'Step 3 Illustration - Check your doorstep',
    backgroundColor: '#ffd24a',
    textColor: '#000000',
    variant: 'yellow',
  },
  {
    id: 'step-4',
    step: 'Step #4',
    title: 'Share your reads',
    description:
      'Share your box and tag us @aardvarkbook or participate in the Club discussions in-app!',
    illustration: step4Illustration,
    alt: 'Step 4 Illustration - Share your reads',
    backgroundColor: '#9982de',
    textColor: '#000000',
    variant: 'periwinkle',
  },
];
