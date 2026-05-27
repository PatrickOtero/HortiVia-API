-- CreateEnum
CREATE TYPE "ArticleBlockKind" AS ENUM ('PARAGRAPH', 'HEADING', 'IMAGE', 'TIP', 'WARNING', 'CHECKLIST', 'STEPS', 'QUOTE', 'PRODUCT_REFERENCE', 'SECTION', 'OTHER');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "coverImageAlt" TEXT,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readingTimeMinutes" INTEGER,
ADD COLUMN     "subtitle" TEXT;

-- CreateTable
CREATE TABLE "ArticleBlock" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "kind" "ArticleBlockKind" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "imageCaption" TEXT,
    "items" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleBlock_articleId_sortOrder_idx" ON "ArticleBlock"("articleId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ArticleBlock" ADD CONSTRAINT "ArticleBlock_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
