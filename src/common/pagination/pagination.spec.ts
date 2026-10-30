import { createPaginationMeta, resolvePagination } from './pagination';

describe('pagination helpers', () => {
  it('applies the shared defaults and derives the offset', () => {
    expect(resolvePagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it('caps the requested limit without changing the requested page', () => {
    expect(resolvePagination({ page: 3, limit: 100 })).toEqual({
      page: 3,
      limit: 50,
      skip: 100,
    });
  });

  it('returns zero pages for an empty result and rounds partial pages up', () => {
    expect(createPaginationMeta(1, 10, 0)).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
    expect(createPaginationMeta(2, 10, 21)).toEqual({
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
    });
  });
});
