CREATE TYPE "PresignedUploadResourceType" AS ENUM ('ARTICLE_BLOCK_IMAGE');
CREATE TYPE "PresignedUploadIntentStatus" AS ENUM ('PENDING', 'ASSOCIATED', 'SIGNING_FAILED');

CREATE TABLE "PresignedUploadIntent" (
    "id" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "resourceType" "PresignedUploadResourceType" NOT NULL,
    "articleId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "contentType" TEXT NOT NULL,
    "declaredSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "PresignedUploadIntentStatus" NOT NULL DEFAULT 'PENDING',
    "associatedAt" TIMESTAMP(3),
    "objectEtag" TEXT,

    CONSTRAINT "PresignedUploadIntent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PresignedUploadIntent_declaredSize_check" CHECK ("declaredSize" > 0)
);

CREATE UNIQUE INDEX "PresignedUploadIntent_objectKey_key" ON "PresignedUploadIntent"("objectKey");
CREATE UNIQUE INDEX "PresignedUploadIntent_publicUrl_key" ON "PresignedUploadIntent"("publicUrl");
CREATE INDEX "PresignedUploadIntent_status_expiresAt_idx" ON "PresignedUploadIntent"("status", "expiresAt");
CREATE INDEX "PresignedUploadIntent_articleId_blockId_createdAt_idx" ON "PresignedUploadIntent"("articleId", "blockId", "createdAt");

ALTER TABLE "PresignedUploadIntent"
ADD CONSTRAINT "PresignedUploadIntent_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
