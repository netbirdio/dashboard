export interface Pagination<T> {
  data: T;
  page: number;
  page_size: number;
  // Present on classic paginated endpoints. Load-more feeds omit these and
  // send has_more instead (no total is computed server-side).
  total_pages?: number;
  total_records?: number;
  has_more?: boolean;
}
