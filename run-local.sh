#!/bin/bash

if [ -f ".env" ]; then
  export $(cat .env | xargs)
else
  echo "Copy and example.env to .env and configure before starting";
  exit 0
fi


MGMT_PORT=${NETBIRD_MGMT_PORT}

npm run build
docker build -f docker/Dockerfile -t netbird/dashboard-local:latest .

docker rm -f netbird-dashboard
docker run -d --name netbird-dashboard  \
  -p 3000:80 -p 443:443 \
  -e AUTH_AUDIENCE=${AUTH_AUDIENCE} \
  -e AUTH_AUTHORITY=${AUTH_AUTHORITY} \
  -e AUTH_CLIENT_ID=${AUTH_CLIENT_ID}  \
  -e USE_AUTH0=true \
  -e AUTH_SUPPORTED_SCOPES='openid profile email api offline_access email_verified' \
  -e NETBIRD_MGMT_API_ENDPOINT=http://localhost:$MGMT_PORT  \
  -e NETBIRD_MGMT_GRPC_API_ENDPOINT=http://localhost:$MGMT_PORT \
  netbird/dashboard-local:latest