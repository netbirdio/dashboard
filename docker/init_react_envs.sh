#!/bin/bash
set -e

if [[ -z "${AUTH_AUTHORITY}" ]]; then
    if [[ -z "${AUTH0_DOMAIN}" ]]; then
        echo "AUTH_AUTHORITY or AUTH0_DOMAIN environment variable must be set"
        exit 1
    fi
fi

if [[ -z "${AUTH_CLIENT_ID}" ]]; then
    if [[ -z "${AUTH0_CLIENT_ID}" ]]; then
        echo "AUTH_CLIENT_ID or AUTH0_CLIENT_ID environment variable must be set"
        exit 1
    fi
fi

if [[ -z "${AUTH_AUDIENCE}" ]]; then
    if [[ -z "${AUTH0_AUDIENCE}" ]]; then
        echo "AUTH_AUDIENCE or AUTH0_AUDIENCE environment variable must be set"
        exit 1
    fi
fi

if [[ "${AUTH_AUDIENCE}" == "none" ]]; then
    unset AUTH_AUDIENCE
fi

if [[ -z "${AUTH_SUPPORTED_SCOPES}" ]]; then
    if [[ -z "${AUTH0_DOMAIN}" ]]; then
        echo "AUTH_SUPPORTED_SCOPES environment variable must be set"
        exit 1
    fi
fi

if [[ -z "${USE_AUTH0}" ]]; then
    if [[ -z "${AUTH0_DOMAIN}" ]]; then
        echo "USE_AUTH0 environment variable must be set"
        exit 1
    fi
fi

if [[ -z "${NETBIRD_MGMT_API_ENDPOINT}" ]]; then
    echo "NETBIRD_MGMT_API_ENDPOINT environment variable must be set"
    exit 1
fi

export AUTH_AUTHORITY=${AUTH_AUTHORITY:-https://$AUTH0_DOMAIN}
export AUTH_CLIENT_ID=${AUTH_CLIENT_ID:-$AUTH0_CLIENT_ID}
export AUTH_CLIENT_SECRET=${AUTH_CLIENT_SECRET}
export AUTH_AUDIENCE=${AUTH_AUDIENCE:-$AUTH0_AUDIENCE}
export AUTH_REDIRECT_URI=${AUTH_REDIRECT_URI}
export AUTH_SILENT_REDIRECT_URI=${AUTH_SILENT_REDIRECT_URI}
export USE_AUTH0=${USE_AUTH0:-true}
export AUTH_SUPPORTED_SCOPES=${AUTH_SUPPORTED_SCOPES:-openid profile email api offline_access email_verified}

export NETBIRD_MGMT_API_ENDPOINT=$(echo $NETBIRD_MGMT_API_ENDPOINT | sed -E 's/(:80|:443)$//')
export NETBIRD_MGMT_GRPC_API_ENDPOINT=${NETBIRD_MGMT_GRPC_API_ENDPOINT}
export NETBIRD_HOTJAR_TRACK_ID=${NETBIRD_HOTJAR_TRACK_ID}
export NETBIRD_GOOGLE_ANALYTICS_ID=${NETBIRD_GOOGLE_ANALYTICS_ID}
export NETBIRD_GOOGLE_TAG_MANAGER_ID=${NETBIRD_GOOGLE_TAG_MANAGER_ID}
export NETBIRD_TOKEN_SOURCE=${NETBIRD_TOKEN_SOURCE:-accessToken}
export NETBIRD_DRAG_QUERY_PARAMS=${NETBIRD_DRAG_QUERY_PARAMS:-false}
export NETBIRD_WASM_PATH=${NETBIRD_WASM_PATH}
export NETBIRD_CSP=${NETBIRD_CSP}
export NETBIRD_CSP_CONNECT_SRC=${NETBIRD_CSP_CONNECT_SRC}

echo "NetBird latest version: ${NETBIRD_LATEST_VERSION}"

# Build CSP
FIRST_PARTY_CSP="https://pkgs.netbird.io"
FIRST_PARTY_CSP_CONNECT_SRC="$NETBIRD_CSP_CONNECT_SRC"
THIRD_PARTY_CSP=""
THIRD_PARTY_CSP_CONNECT_SRC="https://api.github.com/repos/netbirdio/netbird/releases/latest https://raw.githubusercontent.com/netbirdio/dashboard/"
THIRD_PARTY_CSP_SCRIPT_SRC=""

CSP_DOMAINS=""
CSP_DOMAINS_CONNECT_SRC=""

if [[ -n "${NETBIRD_CSP}" ]]; then
    CSP_DOMAINS="$CSP_DOMAINS $NETBIRD_CSP"
fi

# Add AUTH_AUTHORITY to CSP
if [[ -n "${AUTH_AUTHORITY}" ]]; then
    CSP_DOMAINS="$CSP_DOMAINS $AUTH_AUTHORITY"
fi

# Add AUTH_AUDIENCE to CSP
if [[ -n "${AUTH_AUDIENCE}" && "${AUTH_AUDIENCE}" != "none" && "${AUTH_AUDIENCE}" == *.* ]]; then
    if [[ "${AUTH_AUDIENCE}" == *"http://"* || "${AUTH_AUDIENCE}" == *"https://"* ]]; then
        CSP_DOMAINS="$CSP_DOMAINS $AUTH_AUDIENCE"
    else
        CSP_DOMAINS="$CSP_DOMAINS https://$AUTH_AUDIENCE"
    fi
fi

# Add NETBIRD_MGMT_API_ENDPOINT to CSP
if [[ -n "${NETBIRD_MGMT_API_ENDPOINT}" ]]; then
    MGMT_HOST=$(echo "$NETBIRD_MGMT_API_ENDPOINT" | sed -E 's|https?://||' | cut -d'/' -f1)
    if [[ -n "$MGMT_HOST" ]]; then
        if [[ "$NETBIRD_MGMT_API_ENDPOINT" == https://* ]]; then
            CSP_DOMAINS="$CSP_DOMAINS $NETBIRD_MGMT_API_ENDPOINT"
            CSP_DOMAINS_CONNECT_SRC="$CSP_DOMAINS_CONNECT_SRC wss://$MGMT_HOST"
        elif [[ "$NETBIRD_MGMT_API_ENDPOINT" == http://* ]]; then
            CSP_DOMAINS="$CSP_DOMAINS $NETBIRD_MGMT_API_ENDPOINT"
            CSP_DOMAINS_CONNECT_SRC="$CSP_DOMAINS_CONNECT_SRC ws://$MGMT_HOST"
        fi
    fi
fi

# Add LETSENCRYPT_DOMAIN to CSP
if [[ -n "${LETSENCRYPT_DOMAIN}" ]]; then
    if [[ "$LETSENCRYPT_DOMAIN" == *"localhost"* ]]; then
        CSP_DOMAINS="$CSP_DOMAINS http://$LETSENCRYPT_DOMAIN"
        CSP_DOMAINS_CONNECT_SRC="$CSP_DOMAINS_CONNECT_SRC ws://$LETSENCRYPT_DOMAIN ws://*.$LETSENCRYPT_DOMAIN"
    else
        CSP_DOMAINS="$CSP_DOMAINS https://$LETSENCRYPT_DOMAIN"
        CSP_DOMAINS_CONNECT_SRC="$CSP_DOMAINS_CONNECT_SRC wss://$LETSENCRYPT_DOMAIN wss://*.$LETSENCRYPT_DOMAIN"
    fi
fi

CSP_CONNECT_SRC="$CSP_DOMAINS $CSP_DOMAINS_CONNECT_SRC $FIRST_PARTY_CSP $FIRST_PARTY_CSP_CONNECT_SRC $THIRD_PARTY_CSP $THIRD_PARTY_CSP_CONNECT_SRC"
CSP_FRAME_SRC="$CSP_DOMAINS $FIRST_PARTY_CSP $THIRD_PARTY_CSP"
CSP_SCRIPT_SRC="$CSP_DOMAINS $FIRST_PARTY_CSP $THIRD_PARTY_CSP $THIRD_PARTY_CSP_SCRIPT_SRC"

# Remove duplicates
CSP_CONNECT_SRC=$(echo $CSP_CONNECT_SRC | tr ' ' '\n' | grep -v '^$' | sort -u | tr '\n' ' ' | sed 's/ $//')
CSP_FRAME_SRC=$(echo $CSP_FRAME_SRC | tr ' ' '\n' | grep -v '^$' | sort -u | tr '\n' ' ' | sed 's/ $//')
CSP_SCRIPT_SRC=$(echo $CSP_SCRIPT_SRC | tr ' ' '\n' | grep -v '^$' | sort -u | tr '\n' ' ' | sed 's/ $//')

# Update CSP in nginx config
CSP_POLICY="default-src 'none'; connect-src 'self' $CSP_CONNECT_SRC; frame-src 'self' $CSP_FRAME_SRC; script-src 'self' 'wasm-unsafe-eval' $CSP_SCRIPT_SRC; font-src 'self'; img-src * data:; manifest-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
CSP_HEADER="add_header Content-Security-Policy \"$CSP_POLICY\" always;"

# Escape sed special characters in replacement string (& | \)
CSP_HEADER=$(printf '%s' "$CSP_HEADER" | sed -e 's/[\\&|]/\\&/g')

echo "CSP header: $CSP_HEADER"

# Replace CSP header in nginx config
sed -i "s|add_header Content-Security-Policy \"[^\"]*\" always;|$CSP_HEADER|g" /etc/nginx/http.d/default.conf || {
    echo "Failed to replace CSP header"
}

# replace ENVs in the config
ENV_STR="\$\$USE_AUTH0 \$\$AUTH_AUDIENCE \$\$AUTH_AUTHORITY \$\$AUTH_CLIENT_ID \$\$AUTH_CLIENT_SECRET \$\$AUTH_SUPPORTED_SCOPES \$\$NETBIRD_MGMT_API_ENDPOINT \$\$NETBIRD_MGMT_GRPC_API_ENDPOINT \$\$NETBIRD_HOTJAR_TRACK_ID \$\$NETBIRD_GOOGLE_ANALYTICS_ID \$\$NETBIRD_GOOGLE_TAG_MANAGER_ID \$\$AUTH_REDIRECT_URI \$\$AUTH_SILENT_REDIRECT_URI \$\$NETBIRD_TOKEN_SOURCE \$\$NETBIRD_DRAG_QUERY_PARAMS \$\$NETBIRD_WASM_PATH"

OIDC_TRUSTED_DOMAINS="/usr/share/nginx/html/OidcTrustedDomains.js"
envsubst "$ENV_STR" < "$OIDC_TRUSTED_DOMAINS".tmpl > "$OIDC_TRUSTED_DOMAINS"
for f in $(grep -R -l AUTH_SUPPORTED_SCOPES /usr/share/nginx/html); do
    cp "$f" "$f".copy
    envsubst "$ENV_STR" < "$f".copy > "$f"
    rm "$f".copy
done