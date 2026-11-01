import { Injectable } from '@nestjs/common';
import { PresignedUploadIntentStatus } from '../../generated/prisma/enums';
import { ArticleBlockUploadIntentsRepository } from './article-block-upload-intents.repository';
import { ManagedImageReferencesRepository } from '../storage/managed-image-references.repository';
import { StorageService } from '../storage/storage.service';
import {
  PRESIGNED_UPLOAD_DEFAULT_GRACE_MINUTES,
  PRESIGNED_UPLOAD_RECONCILIATION_PAGE_SIZE,
} from '../storage/presigned-upload.constants';

export type PresignedUploadReconciliationReport = {
  attemptsAnalyzed: number;
  associatedAttempts: number;
  expiredUnassociatedAttempts: number;
  notMaturedAttempts: number;
  signingFailedAttempts: number;
  objectsPresent: number;
  objectsMissing: number;
  objectsWithReferences: number;
  potentiallyOrphanedObjects: number;
  changedSinceAssociation: number;
  indeterminateObjects: number;
  queryFailures: number;
};

@Injectable()
export class PresignedUploadReconciliationService {
  constructor(
    private readonly intents: ArticleBlockUploadIntentsRepository,
    private readonly references: ManagedImageReferencesRepository,
    private readonly storage: StorageService,
  ) {}

  async diagnose(params: { now?: Date; graceMinutes?: number } = {}): Promise<PresignedUploadReconciliationReport> {
    const graceMinutes = params.graceMinutes ?? PRESIGNED_UPLOAD_DEFAULT_GRACE_MINUTES;
    if (!Number.isFinite(graceMinutes) || graceMinutes < 0) {
      throw new Error('Presigned upload reconciliation grace period must be a non-negative number.');
    }
    const now = params.now ?? new Date();
    const safeThrough = new Date(now.getTime() - graceMinutes * 60_000);
    const report: PresignedUploadReconciliationReport = {
      attemptsAnalyzed: 0,
      associatedAttempts: 0,
      expiredUnassociatedAttempts: 0,
      notMaturedAttempts: await this.intents.countNotMatured(safeThrough),
      signingFailedAttempts: await this.intents.countByStatus(PresignedUploadIntentStatus.SIGNING_FAILED),
      objectsPresent: 0,
      objectsMissing: 0,
      objectsWithReferences: 0,
      potentiallyOrphanedObjects: 0,
      changedSinceAssociation: 0,
      indeterminateObjects: 0,
      queryFailures: 0,
    };

    let afterId: string | undefined;
    let hasMore = true;
    while (hasMore) {
      const page = await this.intents.findReconciliationPage({
        safeThrough,
        afterId,
        take: PRESIGNED_UPLOAD_RECONCILIATION_PAGE_SIZE,
      });
      if (page.length === 0) {
        hasMore = false;
        continue;
      }
      report.attemptsAnalyzed += page.length;
      report.expiredUnassociatedAttempts += page.filter(
        attempt => attempt.status === PresignedUploadIntentStatus.PENDING,
      ).length;
      await this.classifyPage(page, report);
      afterId = page[page.length - 1].id;
    }

    report.associatedAttempts = await this.intents.countAssociated();
    return report;
  }

  private async classifyPage(
    page: Awaited<ReturnType<ArticleBlockUploadIntentsRepository['findReconciliationPage']>>,
    report: PresignedUploadReconciliationReport,
  ) {
    const checks = await Promise.all(page.map(async attempt => {
      try {
        return {
          attempt,
          object: await this.storage.inspectManagedUpload(
            { key: attempt.objectKey, url: attempt.publicUrl },
            { kind: 'article-block', articleId: attempt.articleId, blockId: attempt.blockId },
          ),
        };
      } catch {
        return { attempt, error: true as const };
      }
    }));

    // Read associations after the slower R2 HEAD calls so a completed association
    // is less likely to be evaluated against an older reference snapshot.
    let references: Set<string> | null = null;
    try {
      references = await this.references.getReferencedUrls(page.map(attempt => attempt.publicUrl));
    } catch {
      report.queryFailures += 1;
    }

    let currentStatuses: Map<string, { status: PresignedUploadIntentStatus; objectEtag: string | null }> | null = null;
    try {
      const statuses = await this.intents.findCurrentStatuses(page.map(attempt => attempt.id));
      currentStatuses = new Map(statuses.map(status => [status.id, status]));
    } catch {
      report.queryFailures += 1;
    }

    for (const check of checks) {
      if ('error' in check) {
        report.queryFailures += 1;
        report.indeterminateObjects += 1;
        continue;
      }
      if (!check.object.exists) {
        report.objectsMissing += 1;
        continue;
      }

      report.objectsPresent += 1;
      const current = currentStatuses?.get(check.attempt.id);
      if (!current) {
        report.indeterminateObjects += 1;
        continue;
      }
      let indeterminate = false;
      if (!references) {
        indeterminate = true;
      } else if (references.has(check.attempt.publicUrl)) {
        report.objectsWithReferences += 1;
      } else if (current.status === PresignedUploadIntentStatus.ASSOCIATED) {
        // An associated attempt may have been deliberately replaced or removed.
        // Preserve it for manual review instead of calling it abandoned.
        indeterminate = true;
      } else {
        if (current.status === PresignedUploadIntentStatus.PENDING) {
          report.potentiallyOrphanedObjects += 1;
        } else {
          indeterminate = true;
        }
      }
      if (current.status === PresignedUploadIntentStatus.ASSOCIATED) {
        if (current.objectEtag && check.object.etag && current.objectEtag !== check.object.etag) {
          report.changedSinceAssociation += 1;
          indeterminate = true;
        } else if (!current.objectEtag || !check.object.etag) {
          indeterminate = true;
        }
      }
      if (indeterminate) report.indeterminateObjects += 1;
    }
  }
}
