-- CreateEnum
CREATE TYPE "ProductImageKind" AS ENUM (
    'HERO',
    'WHOLE',
    'CUT',
    'IDEAL_STATE',
    'UNRIPE_STATE',
    'DEFECT',
    'STORAGE',
    'USAGE',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "ProductGuideSectionKind" AS ENUM (
    'CHOOSE',
    'OBSERVE',
    'STORE',
    'USE',
    'QUICK_FACTS',
    'OTHER'
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "caption" TEXT,
    "kind" "ProductImageKind" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductGuideSection" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "ProductGuideSectionKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "imageCaption" TEXT,
    "bullets" TEXT[],
    "idealPoints" TEXT[],
    "avoidPoints" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductGuideSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductGuideSection_productId_sortOrder_idx" ON "ProductGuideSection"("productId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ProductImage"
ADD CONSTRAINT "ProductImage_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductGuideSection"
ADD CONSTRAINT "ProductGuideSection_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
