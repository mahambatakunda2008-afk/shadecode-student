import type { TourStep } from './types/tour';

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'dashboard-overview',
    step: 1,
    title: 'Your Learning Dashboard',
    description:
      'This is your command center. View active learning paths, your daily streak, and real-time progress across every subject — all in one place.',
    targetSelector: 'dashboard-overview',
    position: 'bottom',
    icon: '🎯',
    badge: 'Start Here',
    tip: 'Check this daily to stay on track.',
  },
  {
    id: 'knowledge-units',
    step: 2,
    title: 'KnowledgeUnits',
    description:
      'Every subject is broken into focused KnowledgeUnits — concept-sized learning blocks you master one at a time. Each unit builds on the last, creating a solid, lasting foundation.',
    targetSelector: 'knowledge-units',
    position: 'right',
    icon: '🧠',
    tip: 'Units take 5–15 minutes each.',
  },
  {
    id: 'adaptive-tutor',
    step: 3,
    title: 'Your Adaptive AI Tutor',
    description:
      "The tutor watches how you perform and shifts difficulty in real time. Struggle on a concept? It slows down and explains more. Ace it? It pushes you harder. It's always calibrated to you.",
    targetSelector: 'adaptive-tutor',
    position: 'left',
    icon: '⚡',
    tip: 'Performance data shapes every session.',
  },
  {
    id: 'start-learning',
    step: 4,
    title: 'Start Your First Session',
    description:
      'Tap any KnowledgeUnit to begin. Your first session is pre-selected based on your subjects. Even 10 focused minutes a day compounds into deep mastery over weeks.',
    targetSelector: 'start-learning',
    position: 'bottom',
    icon: '🚀',
    tip: 'Consistency beats intensity.',
  },
  {
    id: 'progress-tracking',
    step: 5,
    title: 'Track Your Mastery',
    description:
      'Every session updates your mastery score per topic. Watch progress bars fill, earn XP, and get a clear view of exactly what needs more work — no guessing.',
    targetSelector: 'progress-tracking',
    position: 'top',
    icon: '📈',
    tip: 'Mastery is measured, not assumed.',
  },
];

export const TOUR_STORAGE_KEY = 'shadecode:tour:v1';
export const TOUR_VERSION = '1';
