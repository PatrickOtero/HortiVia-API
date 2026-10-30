export interface PageQuery {
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export function resolvePagination(query: PageQuery): Pagination {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  return { page, limit, skip: (page - 1) * limit };
}

export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
