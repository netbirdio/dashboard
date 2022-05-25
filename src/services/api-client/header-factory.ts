export interface RequestHeader {
  'Content-Type': string;
  [key: string]: unknown;
}

const headersFactory = async (getAccessTokenSilently:any): Promise<RequestHeader> => {
  const headers: RequestHeader = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  //const token = await getLocalItem<string>(StorageKey.token);
  const token = await getAccessTokenSilently()

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
};

export { headersFactory };
