export interface RequestHeader {
  'Content-Type': string;
  [key: string]: unknown;
}

const headersFactory = async (accessToken:any): Promise<RequestHeader> => {
  const headers: RequestHeader = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

export { headersFactory };
