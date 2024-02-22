export interface AccessToken {
  id: string;
  name: string;
  expiration_date: Date;
  created_by: string;
  created_at: Date;
  last_used: Date;
  plain_token?: string;
}
