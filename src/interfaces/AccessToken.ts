export interface AccessToken {
  id: string;
  name: string;
  expiration_date: Date;
  created_by: string;
  created_at: Date;
  last_used: Date;
  plain_token?: string;
}

export interface SpecificPAT {
  name: string;
  user_id: string;
  id: string;
}

export interface PersonalAccessTokenGenerated {
  plain_token: string;
  personal_access_token: AccessToken;
}

export interface PersonalAccessTokenCreate {
  user_id: string;
  name: string;
  expires_in: number;
}
