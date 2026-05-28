-- CreateEnum
CREATE TYPE "ArticleReactionType" AS ENUM ('HELPFUL');

-- CreateTable
CREATE TABLE "ArticleReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" "ArticleReactionType" NOT NULL DEFAULT 'HELPFUL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleReaction_userId_createdAt_idx" ON "ArticleReaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleReaction_articleId_type_idx" ON "ArticleReaction"("articleId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleReaction_userId_articleId_type_key" ON "ArticleReaction"("userId", "articleId", "type");

-- AddForeignKey
ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
