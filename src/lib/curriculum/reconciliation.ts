/**
 * Reconciliation and trust checks for authoritative learning content.
 *
 * Reconciliation is intentionally conservative: a pack is never considered
 * complete merely because it contains many records. The source inventory
 * must explicitly declare the expected content IDs and every active record
 * must be verified before a pack can become production-aligned.
 */
import type { LearningContentItem, LearningScope, LearningScopeIdentity } from "../code-lab/learning-scope";
import { isVerifiedLearningContent, sameLearningScope } from "../code-lab/learning-scope";

export type ReconciliationIssueCode =
  | "identity-mismatch"
  | "duplicate-id"
  | "missing-content"
  | "orphaned-content"
  | "unverified-content"
  | "invalid-parent"
  | "empty-scope";

export interface ReconciliationIssue {
  code: ReconciliationIssueCode;
  severity: "error" | "warning";
  contentId?: string;
  message: string;
}

export interface ReconciliationResult {
  usable: boolean;
  complete: boolean;
  verified: boolean;
  expectedCount: number;
  actualCount: number;
  verifiedCount: number;
  missingIds: string[];
  orphanedIds: string[];
  issues: ReconciliationIssue[];
}

export interface AuthoritativeContentInventory {
  identity: LearningScopeIdentity;
  expectedContentIds: string[];
}

/**
 * Compare a learning scope with an explicit authoritative inventory.
 *
 * This function does not mutate the scope and does not set `complete` or
 * `verified`. Those flags remain explicit source-of-truth decisions.
 */
export function reconcileLearningScope(
  scope: LearningScope,
  inventory: AuthoritativeContentInventory,
): ReconciliationResult {
  const issues: ReconciliationIssue[] = [];
  const expected = new Set(inventory.expectedContentIds);
  const seen = new Set<string>();
  const missingIds = inventory.expectedContentIds.filter((id) => !scope.content.some((item) => item.id === id));
  const orphanedIds: string[] = [];

  if (!sameLearningScope(scope.identity, inventory.identity)) {
    issues.push({
      code: "identity-mismatch",
      severity: "error",
      message: "Learning scope identity does not match the authoritative inventory.",
    });
  }

  for (const item of scope.content) {
    if (seen.has(item.id)) {
      issues.push({
        code: "duplicate-id",
        severity: "error",
        contentId: item.id,
        message: `Duplicate learning content ID: ${item.id}`,
      });
    }
    seen.add(item.id);

    if (!expected.has(item.id) && item.status !== "archived") {
      orphanedIds.push(item.id);
      issues.push({
        code: "orphaned-content",
        severity: "error",
        contentId: item.id,
        message: `Active content is not present in the authoritative inventory: ${item.id}`,
      });
    }

    if (item.parentId && !scope.content.some((parent) => parent.id === item.parentId)) {
      issues.push({
        code: "invalid-parent",
        severity: "error",
        contentId: item.id,
        message: `Parent content does not exist: ${item.parentId}`,
      });
    }

    if (item.status !== "archived" && !isVerifiedLearningContent(item)) {
      issues.push({
        code: "unverified-content",
        severity: "error",
        contentId: item.id,
        message: `Active content is not fully verified: ${item.id}`,
      });
    }
  }

  if (scope.content.filter((item) => item.status !== "archived").length === 0) {
    issues.push({ code: "empty-scope", severity: "error", message: "Learning scope has no active content." });
  }

  for (const id of missingIds) {
    issues.push({
      code: "missing-content",
      severity: "error",
      contentId: id,
      message: `Authoritative content is missing from the learning scope: ${id}`,
    });
  }

  const active = scope.content.filter((item) => item.status !== "archived");
  const verifiedCount = active.filter(isVerifiedLearningContent).length;
  const hasErrors = issues.some((issue) => issue.severity === "error");

  return {
    usable: scope.complete && scope.verified && !hasErrors,
    complete: scope.complete && missingIds.length === 0 && orphanedIds.length === 0,
    verified: scope.verified && active.every(isVerifiedLearningContent),
    expectedCount: inventory.expectedContentIds.length,
    actualCount: active.length,
    verifiedCount,
    missingIds,
    orphanedIds,
    issues,
  };
}

/** Build an explicit inventory from content IDs supplied by an authoritative source. */
export function createContentInventory(
  identity: LearningScopeIdentity,
  content: Pick<LearningContentItem, "id">[],
): AuthoritativeContentInventory {
  return { identity, expectedContentIds: [...new Set(content.map((item) => item.id))] };
}
