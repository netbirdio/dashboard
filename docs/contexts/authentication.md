# Authentication

## Purpose
OIDC-based authentication using Auth0 or compatible providers.

## File Paths
- `src/auth/OIDCProvider.tsx` - Main OIDC provider
- `src/auth/SecureProvider.tsx` - Protected route wrapper
- `src/auth/OIDCError.tsx` - Error display
- `src/auth/SessionLost.tsx` - Session lost handling

## Key Dependencies
- `@axa-fr/react-oidc` - OIDC client library

## Configuration
Configuration in `config.json`:
```json
{
  "auth0Domain": "your-tenant.auth0.com",
  "auth0ClientId": "your-client-id",
  "auth0Audience": "your-audience",
  "auth0Authority": "https://your-tenant.auth0.com",
  "auth0RedirectUri": "http://localhost:3000",
  "authScope": "openid profile email"
}
```

## Environment Variables (Docker)
- `AUTH0_DOMAIN` - Auth0 tenant domain
- `AUTH0_CLIENT_ID` - Auth0 application client ID
- `AUTH0_AUDIENCE` - API audience identifier

## Usage

### Protected Routes
```tsx
import SecureProvider from "@/auth/SecureProvider";

export default function Layout({ children }) {
  return <SecureProvider>{children}</SecureProvider>;
}
```

### Access User Info
```tsx
import { useOidc, useOidcAccessToken, useOidcIdToken } from "@axa-fr/react-oidc";

function MyComponent() {
  const { isAuthenticated, login, logout } = useOidc();
  const { oidcAccessToken } = useOidcAccessToken();
  const { oidcIdToken } = useOidcIdToken();
  // ...
}
```

## Flow
1. User visits protected route
2. `SecureProvider` checks authentication
3. If not authenticated, redirects to Auth0 login
4. After login, Auth0 redirects back with tokens
5. Tokens stored in memory (not localStorage)
6. API calls use access token for authorization

## Service Worker
OIDC service worker must be copied to `public/`:
```bash
npm run copy
npm run copytrusted
```

This enables:
- Token refresh without page reload
- Secure token storage
- Silent authentication

## Local Development
Create `.local-config.json`:
```json
{
  "auth0Domain": "localhost",
  "auth0ClientId": "test-client-id",
  "auth0Audience": "test-audience",
  "auth0Authority": "http://localhost:9999",
  "auth0RedirectUri": "http://localhost:3000"
}
```

## Gotchas
- Service worker file must be in `public/` directory
- Tokens are in-memory only (cleared on page refresh)
- CORS must be configured on Auth0 for local development
- Redirect URI must match Auth0 configuration exactly
- Silent authentication requires HTTPS in production
