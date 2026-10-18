/**
 * Diamond brand mark for generated share-card images.
 * Drawn with shapes on purpose: the image renderer's default font has no "◈" glyph,
 * so a text character shows up as an empty box on every shared card.
 */
export function BrandMark({ size, color }: { size: number; color: string }) {
  const outer = Math.round(size * 0.72);
  const inner = Math.max(3, Math.round(outer * 0.34));
  const border = Math.max(2, Math.round(size / 9));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: outer,
        height: outer,
        border: `${border}px solid ${color}`,
        transform: 'rotate(45deg)',
      }}
    >
      <div style={{ display: 'flex', width: inner, height: inner, background: color }} />
    </div>
  );
}
