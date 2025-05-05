export interface Pagination<T> {
  data: T;
  page: number;
  page_size: number;
  total_pages: number;
  total_records: number;
}
