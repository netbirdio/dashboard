#!/bin/bash
set -e

if [[ -z "${AUTH0_DOMAIN}" ]]; then
    echo "AUTH0_DOMAIN environment variable must be set"
    exit 1
fi

if [[ -z "${AUTH0_CLIENT_ID}" ]]; then
    echo "AUTH0_CLIENT_ID environment variable must be set"
    exit 1
fi

if [[ -z "${AUTH0_AUDIENCE}" ]]; then
    echo "AUTH0_AUDIENCE environment variable must be set"
    exit 1
fi

if [[ -z "${NETBIRD_MGMT_API_ENDPOINT}" ]]; then
    echo "NETBIRD_MGMT_API_ENDPOINT environment variable must be set"
    exit 1
fi

AUTH0_DOMAIN=${AUTH0_DOMAIN}
AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID}
AUTH0_AUDIENCE=${AUTH0_AUDIENCE}
NETBIRD_MGMT_API_ENDPOINT=${NETBIRD_MGMT_API_ENDPOINT}
NETBIRD_MGMT_GRPC_API_ENDPOINT=${NETBIRD_MGMT_GRPC_API_ENDPOINT}

# replace ENVs in the config
ENV_STR="\$\$AUTH0_DOMAIN \$\$AUTH0_CLIENT_ID \$\$AUTH0_AUDIENCE \$\$NETBIRD_MGMT_API_ENDPOINT \$\$NETBIRD_MGMT_GRPC_API_ENDPOINT"
MAIN_JS=$(find /usr/share/nginx/html/static/js/main.*js)
cp "$MAIN_JS" "$MAIN_JS".copy
envsubst "$ENV_STR" < "$MAIN_JS".copy > "$MAIN_JS"
rm "$MAIN_JS".copy



