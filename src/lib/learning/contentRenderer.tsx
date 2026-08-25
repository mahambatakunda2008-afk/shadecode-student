'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { DiagramSpec, LearningContentBlock, LearningLesson } from './content';

export interface LearningContentRendererProps {
  lesson?: LearningLesson;
  blocks?: LearningContentBlock[];
  renderDiagram?: (diagram: DiagramSpec) => ReactNode;
  renderQuestion?: (block: Extract<LearningContentBlock, { type: 'question' }>) => ReactNode;
  renderInteractive?: (block: Extract<LearningContentBlock, { type: 'interactive' }>) => ReactNode;
  className?: string;
}

const styles: Record<string, CSSProperties> = {
  root: { display: 'grid', gap: 20 },
  prose: { lineHeight: 1.75 },
  equation: { overflowX: 'auto', padding: 16, borderRadius: 14 },
  code: { overflowX: 'auto', padding: 16, borderRadius: 14 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  callout: { padding: 16, borderRadius: 16 },
};

function DiagramFallback({ diagram }: { diagram: DiagramSpec }) {
  return (
    <figure aria-label={diagram.altText} style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${diagram.width} ${diagram.height}`} role="img" aria-label={diagram.altText} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {diagram.edges.map((edge) => {
          const from = diagram.nodes.find((n) => n.id === edge.from);
          const to = diagram.nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth="2" />;
        })}
        {diagram.nodes.map((node) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r="5" fill="currentColor" />
            {node.label ? <text x={node.x + 9} y={node.y - 9} fontSize="12" fill="currentColor">{node.label}</text> : null}
          </g>
        ))}
        {diagram.labels?.map((label) => <text key={label.id} x={label.x} y={label.y} fontSize="12" fill="currentColor">{label.text}</text>)}
      </svg>
      {diagram.caption ? <figcaption>{diagram.caption}</figcaption> : null}
    </figure>
  );
}

function Block({ block, props }: { block: LearningContentBlock; props: LearningContentRendererProps }) {
  switch (block.type) {
    case 'prose': return <section style={styles.prose} dangerouslySetInnerHTML={{ __html: block.markdown }} />;
    case 'equation': return <div data-content-type="equation" style={styles.equation} aria-label={block.label ?? 'Equation'}>{block.latex}</div>;
    case 'code': return <pre data-content-type="code" style={styles.code}><code>{block.code}</code></pre>;
    case 'table': return <div style={styles.tableWrap}><table style={styles.table}><thead><tr>{block.columns.map((c) => <th key={c} scope="col" style={{ textAlign: 'left', padding: 10 }}>{c}</th>)}</tr></thead><tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} style={{ padding: 10 }}>{cell}</td>)}</tr>)}</tbody></table></div>;
    case 'diagram': return props.renderDiagram ? props.renderDiagram(block.diagram) : <DiagramFallback diagram={block.diagram} />;
    case 'question': return props.renderQuestion ? props.renderQuestion(block) : <article><strong>{block.question.marks} marks</strong><p>{block.question.stem}</p></article>;
    case 'worked_solution': return <section><h3>{block.title ?? 'Worked solution'}</h3>{block.steps.map((step, i) => <div key={i} style={{ marginBlock: 10 }}><strong>Step {i + 1}</strong><p>{step.text}</p>{step.equation ? <code>{step.equation}</code> : null}{step.diagram ? (props.renderDiagram ? props.renderDiagram(step.diagram) : <DiagramFallback diagram={step.diagram} />) : null}</div>)}</section>;
    case 'callout': return <aside data-tone={block.tone} style={styles.callout}><strong>{block.title}</strong><p>{block.body}</p></aside>;
    case 'interactive': return props.renderInteractive ? props.renderInteractive(block) : <div data-content-type="interactive">Interactive content: {block.kind}</div>;
    default: return null;
  }
}

export function LearningContentRenderer(props: LearningContentRendererProps) {
  const blocks = props.blocks ?? props.lesson?.blocks ?? [];
  return <div className={props.className} style={styles.root}>{blocks.map((block) => <Block key={block.id} block={block} props={props} />)}</div>;
}
