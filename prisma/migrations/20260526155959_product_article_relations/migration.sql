-- CreateTable
CREATE TABLE "ProductArticle" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductArticle_productId_sortOrder_createdAt_idx" ON "ProductArticle"("productId", "sortOrder", "createdAt");

-- CreateIndex
CREATE INDEX "ProductArticle_articleId_sortOrder_createdAt_idx" ON "ProductArticle"("articleId", "sortOrder", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductArticle_productId_articleId_key" ON "ProductArticle"("productId", "articleId");

-- AddForeignKey
ALTER TABLE "ProductArticle" ADD CONSTRAINT "ProductArticle_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductArticle" ADD CONSTRAINT "ProductArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
