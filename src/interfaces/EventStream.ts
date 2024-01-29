export interface EventStream {
  id: number;
  account_id: string;
  enabled: boolean;
  platform: string;
  created_at: Date;
  updated_at: Date;
  config: {
    api_key: string;
    api_url: string;
  };
}
