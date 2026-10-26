import { productDetailInclude } from './product-model';

describe('productDetailInclude related articles', () => {
  it('selects only metadata required for product article previews', () => {
    const select = productDetailInclude.articleRelations.include.article.select;

    expect(select).toEqual({
      id: true,
      title: true,
      slug: true,
      summary: true,
      category: true,
      imageUrl: true,
      coverImageUrl: true,
      publishedAt: true,
      createdAt: true,
    });
    expect(select).not.toHaveProperty('content');
    expect(select).not.toHaveProperty('blocks');
  });
});
