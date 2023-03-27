
export interface PersonalAccessToken {
  id: string;
  description: string;
  expiration_date: string;
  created_by: string;
  created_at: string;
  last_used: string;
}

export interface SpecificPAT {
  description: string,
  user_id: string,
  id: string,
}

export interface PersonalAccessTokenCreate {
  user_id: string,
  description: string,
  expires_in: number,
}
