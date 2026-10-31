export type ManagedImageScope =
  | { kind: 'avatar'; userId: string }
  | { kind: 'product-main'; productId: string }
  | { kind: 'product-gallery'; productId: string; imageId: string }
  | { kind: 'product-guide'; productId: string; sectionId: string }
  | { kind: 'article-main'; articleId: string }
  | { kind: 'article-block'; articleId: string; blockId: string };
