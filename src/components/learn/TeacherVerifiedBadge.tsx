import { BadgeCheck } from "lucide-react";
import { describeVerification, type VerificationInfo } from "@/lib/teacher/verification";

/** Shown only on published tutorials, which the database guarantees were reviewed and verified first. */
export default function TeacherVerifiedBadge({ detail, compact = false, ...info }: VerificationInfo & { detail?: boolean; compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)] bg-[var(--success-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--success)]"
      title={describeVerification(info)}
    >
      <BadgeCheck size={14} aria-hidden="true" />
      <span>Teacher verified</span>
      {detail && !compact && <span className="font-normal opacity-80">· {describeVerification(info)}</span>}
    </span>
  );
}
