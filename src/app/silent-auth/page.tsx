import CallbackPage from "@/auth/CallbackPage";

/**
 * OIDC silent authentication callback route.
 * This page handles silent token renewal redirects from the identity provider.
 */
export default function SilentAuthCallbackPage() {
    return <CallbackPage />;
}
