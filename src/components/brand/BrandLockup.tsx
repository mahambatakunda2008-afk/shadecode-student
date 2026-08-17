import { BrandMark } from "./BrandMark";

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "shadecode-brand shadecode-brand--compact" : "shadecode-brand"}>
      <BrandMark className="shadecode-brand__mark" aria-hidden="true" />
      <span className="shadecode-brand__words" aria-label="Shadecode Student">
        <span className="shadecode-brand__name">SHADECODE</span>
        <span className="shadecode-brand__product">STUDENT</span>
      </span>
    </span>
  );
}
