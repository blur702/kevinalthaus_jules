export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
  search?: string;
  relations?: string[];
  select?: string[];
  withDeleted?: boolean;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BulkOperationResult<T> {
  success: T[];
  failed: Array<{
    item: Partial<T>;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: any;
  logical?: 'AND' | 'OR';
}

export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  LIKE = 'like',
  ILIKE = 'ilike',
  IN = 'in',
  NOT_IN = 'not_in',
  BETWEEN = 'between',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
}

export interface SortOption {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface SearchOptions {
  query: string;
  fields: string[];
  fuzzy?: boolean;
  boost?: Record<string, number>;
}

export interface AggregationOptions {
  groupBy: string[];
  aggregates: Array<{
    field: string;
    function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
    alias?: string;
  }>;
}

export interface QueryContext {
  userId?: string;
  tenantId?: string;
  permissions?: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface CacheOptions {
  key?: string;
  ttl?: number;
  tags?: string[];
  invalidateOnUpdate?: boolean;
}