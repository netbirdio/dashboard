
export interface PersonalAccessToken {
  id: string;
  name: string;
  expiration_date: string;
  created_by: string;
  created_at: string;
  last_used: string;
}

export interface SpecificPAT {
  name: string,
  user_id: string,
  id: string,
}

export interface PersonalAccessTokenCreate {
  user_id: string,
  name: string,
  expires_in: number,
}
