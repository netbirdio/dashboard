#!/bin/bash
npm run build
docker build -f docker/Dockerfile -t netbird/dashboard-local:latest .

docker run -d --name netbird-dashboard -p 3000:80 -p 443:443 -e AUTH_AUDIENCE=netbird -e AUTH_AUTHORITY=http://localhost:8080/realms/netbird -e AUTH_CLIENT_ID=netbird -e USE_AUTH0=false -e AUTH_SUPPORTED_SCOPES='openid profile email' -e NETBIRD_MGMT_API_ENDPOINT=http://localhost:80 -e NETBIRD_MGMT_GRPC_API_ENDPOINT=http://localhost:80  netbird/dashboard-local:latest