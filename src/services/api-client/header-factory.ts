export interface RequestHeader {
  'Content-Type': string;
  [key: string]: unknown;
}

const headersFactory = async (getAccessTokenSilently:any): Promise<RequestHeader> => {
  const headers: RequestHeader = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const token = await getAccessTokenSilently() as string
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
};

export { headersFactory };
