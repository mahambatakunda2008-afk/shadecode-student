import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LearningContentRenderer } from './contentRenderer';

const diagram = {
  version: 1 as const,
  type: 'geometry' as const,
  width: 200,
  height: 100,
  nodes: [{ id: 'a', x: 20, y: 50, label: 'A' }, { id: 'b', x: 180, y: 50, label: 'B' }],
  edges: [{ id: 'ab', from: 'a', to: 'b', arrow: true }],
  altText: 'A line from A to B',
};

describe('LearningContentRenderer', () => {
  it('renders all core learning primitives without crashing', () => {
    const html = renderToStaticMarkup(<LearningContentRenderer blocks={[
      { type: 'prose', id: 'p', markdown: '<p>Hello</p>' },
      { type: 'equation', id: 'e', latex: 'v = u + at' },
      { type: 'code', id: 'c', language: 'text', code: 'print(1)' },
      { type: 'table', id: 't', columns: ['A'], rows: [['B']] },
      { type: 'diagram', id: 'd', diagram },
      { type: 'question', id: 'q', question: { stem: 'What is v?', marks: 2, skillTags: ['kinematics'], difficulty: 2 } },
      { type: 'worked_solution', id: 'w', steps: [{ text: 'Substitute the values.' }] },
      { type: 'callout', id: 'i', tone: 'tip', title: 'Tip', body: 'Check units.' },
      { type: 'interactive', id: 'x', kind: 'quiz', data: {} },
    ]} />);
    expect(html).toContain('Hello');
    expect(html).toContain('v = u + at');
    expect(html).toContain('<svg');
    expect(html).toContain('What is v?');
    expect(html).toContain('Worked solution');
    expect(html).toContain('Interactive content');
  });
});
