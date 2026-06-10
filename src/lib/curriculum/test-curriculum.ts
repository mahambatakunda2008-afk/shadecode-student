import { computeCurriculumState } from './index';

function eq(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

let failures = 0;

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    failures++;
    console.error(`❌ ${name}:`, e instanceof Error ? e.message : e);
  }
}

run('Linear prerequisites A->B->C', () => {
  const lessons = [
    { id: 'A', title: 'A', subject_id: 's', progress: 100, updated_at: '2026-01-01T00:00:00Z' },
    { id: 'B', title: 'B', subject_id: 's', progress: 50, updated_at: '2026-02-01T00:00:00Z' },
    { id: 'C', title: 'C', subject_id: 's', progress: 0, updated_at: '2026-03-01T00:00:00Z' },
  ];
  const prereqs = [
    { lesson_id: 'B', prerequisite_lesson_id: 'A' },
    { lesson_id: 'C', prerequisite_lesson_id: 'B' },
  ];
  const state = computeCurriculumState(lessons as any, prereqs as any);
  if (!state.currentLesson || state.currentLesson.id !== 'B') throw new Error('expected current B');
  if (!state.recommendedNextLesson || state.recommendedNextLesson.id !== 'B') throw new Error('expected recommended B');
  if (state.lockedLessons.find((l) => l.id === 'C') == null) throw new Error('expected C locked');
  if (state.completedLessons.length !== 1 || state.completedLessons[0].id !== 'A') throw new Error('expected completed A');
  const expectedPct = Math.round((100 + 50 + 0) / 3);
  if (state.completionPercent !== expectedPct) throw new Error(`expected completion ${expectedPct}, got ${state.completionPercent}`);
});

run('Cycle A<->B is tolerated (no deadlock)', () => {
  const lessons = [
    { id: 'A', title: 'A', subject_id: 's', progress: 0, updated_at: '2026-01-01T00:00:00Z' },
    { id: 'B', title: 'B', subject_id: 's', progress: 0, updated_at: '2026-02-01T00:00:00:00Z' },
  ];
  const prereqs = [
    { lesson_id: 'A', prerequisite_lesson_id: 'B' },
    { lesson_id: 'B', prerequisite_lesson_id: 'A' },
  ];
  const state = computeCurriculumState(lessons as any, prereqs as any);
  if (state.lockedLessons.length !== 0) throw new Error('expected no locked lessons after cycle mitigation');
  if (!state.recommendedNextLesson) throw new Error('expected a recommended lesson');
});

run('External prereq rows are ignored', () => {
  const lessons = [
    { id: 'X', title: 'X', subject_id: 's', progress: 0, updated_at: '2026-01-01T00:00:00Z' },
    { id: 'Y', title: 'Y', subject_id: 's', progress: 0, updated_at: '2026-02-01T00:00:00Z' },
  ];
  const prereqs = [
    { lesson_id: 'Y', prerequisite_lesson_id: 'Z' }, // Z not present
  ];
  const state = computeCurriculumState(lessons as any, prereqs as any);
  // since prereq references missing node, it should be ignored and Y unlocked
  if (state.lockedLessons.length !== 0) throw new Error('expected no locked lessons when prereq external');
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
} else {
  console.log('\nAll tests passed');
  process.exit(0);
}
