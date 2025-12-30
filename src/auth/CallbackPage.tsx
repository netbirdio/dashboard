"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Callback page component for OIDC authentication redirects.
 * This page provides a valid route for static export at /auth and /silent-auth,
 * preventing 404 errors with standards-compliant OAuth 2.0 redirect URIs.
 *
 * The @axa-fr/react-oidc library intercepts these routes when OAuth callback
 * parameters are present and renders its own callback handler. This component
 * serves as a fallback if somehow rendered directly.
 */
export default function CallbackPage() {
    const router = useRouter();

    useEffect(() => {
        // Fallback: if this component renders directly, redirect to /peers
        const timer = setTimeout(() => {
            router.replace("/peers");
        }, 100);

        return () => clearTimeout(timer);
    }, [router]);

    return <FullScreenLoading />;
}
