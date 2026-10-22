type QuestionContent = {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  sourceReference: string;
  sortOrder: number;
  isPublished: boolean;
  isDemo: boolean;
};

type ExistingQuestion = QuestionContent & { version: number };

export type EditorialApplyStatus =
  | 'READY'
  | 'ALREADY_APPLIED'
  | 'PUBLISHED_PRESERVED'
  | 'MISSING'
  | 'VERSION_CONFLICT'
  | 'CONTENT_CONFLICT';

export type LockedEditorialDecision = 'APPLY' | 'SKIP' | 'PRESERVE' | 'CONFLICT';

function sameContent(left: QuestionContent, right: QuestionContent) {
  return left.prompt === right.prompt && JSON.stringify(left.options) === JSON.stringify(right.options) &&
    left.correctOptionIndex === right.correctOptionIndex && left.explanation === right.explanation &&
    left.sourceReference === right.sourceReference && left.sortOrder === right.sortOrder &&
    left.isPublished === right.isPublished && left.isDemo === right.isDemo;
}

/** Conservative three-way check: only untouched version-1 drafts are eligible. */
export function classifyEditorialRevision(
  current: ExistingQuestion | null,
  original: QuestionContent,
  revised: QuestionContent,
): EditorialApplyStatus {
  if (!current) return 'MISSING';
  if (current.isPublished) return 'PUBLISHED_PRESERVED';
  if (sameContent(current, revised) && current.version > 1) return 'ALREADY_APPLIED';
  if (current.version !== 1) return 'VERSION_CONFLICT';
  return sameContent(current, original) ? 'READY' : 'CONTENT_CONFLICT';
}

/** Reconciles the preflight result with the row state observed under its lock. */
export function decideLockedEditorialRevision(
  preflight: EditorialApplyStatus,
  locked: EditorialApplyStatus,
): LockedEditorialDecision {
  if (preflight === 'PUBLISHED_PRESERVED') {
    return locked === 'PUBLISHED_PRESERVED' ? 'PRESERVE' : 'CONFLICT';
  }
  if (locked === 'PUBLISHED_PRESERVED') {
    return ['READY', 'ALREADY_APPLIED', 'PUBLISHED_PRESERVED'].includes(preflight) ? 'PRESERVE' : 'CONFLICT';
  }
  if (preflight === 'READY') {
    if (locked === 'READY') return 'APPLY';
    if (locked === 'ALREADY_APPLIED') return 'SKIP';
  }
  if (preflight === 'ALREADY_APPLIED' && locked === 'ALREADY_APPLIED') return 'SKIP';
  return 'CONFLICT';
}
