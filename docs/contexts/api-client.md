# API Client

## Purpose
Centralized API client with SWR integration and OIDC authentication.

## File Path
- `src/utils/api.tsx`

## Key Exports
```typescript
// Main hook for API calls
export default function useFetchApi<T>(
  url: string,
  options?: RequestOptions
): SWRResponse<T, ErrorResponse>;

// Request options
type RequestOptions = {
  key?: string;
  signal?: AbortSignal;
  origin?: string;
  globalParams?: Params;
  ignoreGlobalParams?: boolean;
  refreshInterval?: number;
  blob?: boolean;
  shouldRetryOnError?: boolean;
};

// Error response type
export type ErrorResponse = {
  code: number;
  message: string;
};

// Query params type
export type Params = Record<string, string | number | boolean>;
```

## Usage Patterns

### GET Request
```tsx
const { data, isLoading, error } = useFetchApi<Peer[]>("/peers");
```

### GET with Refresh
```tsx
const { data } = useFetchApi<Peer[]>("/peers", {
  refreshInterval: 5000, // Poll every 5 seconds
});
```

### POST/PUT/DELETE
```tsx
const { mutate } = useFetchApi("/peers", { method: "POST" });
// Or use direct apiRequest function
```

### Custom Key
```tsx
const { data } = useFetchApi("/peers", {
  key: "my-custom-key",
});
```

## Implementation Details

### Authentication
- Uses OIDC tokens from `@axa-fr/react-oidc`
- Automatically injects Authorization header
- Handles token refresh

### Caching
- Uses SWR for caching and revalidation
- Global config in `ApplicationProvider`
- Supports refresh intervals

### Error Handling
- Returns structured `ErrorResponse`
- Integrates with `ErrorBoundary`
- Configurable retry behavior

### Configuration
- Base URL from `config.json` (`apiOrigin`)
- Can override with `origin` option
- Global params merged from `ApplicationContext`

## Dependencies
- `swr` - Data fetching and caching
- `@axa-fr/react-oidc` - OIDC authentication
- `react-jwt` - JWT token handling

## Gotchas
- Requires OIDC provider to be initialized
- Tokens stored in memory (not localStorage)
- Global params applied to all requests unless `ignoreGlobalParams: true`
- Use `shouldRetryOnError: false` to disable automatic retries
