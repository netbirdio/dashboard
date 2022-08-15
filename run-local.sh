#!/bin/bash
npm run build
docker build -f docker/Dockerfile -t netbird/dashboard-local:latest .

docker rm -f netbird-dashboard
docker run -d --name netbird-dashboard -p 3000:80 -p 443:443 -e AUTH_AUDIENCE=http://localhost:3000/ -e AUTH_AUTHORITY=https://netbird-localdev.eu.auth0.com -e AUTH_CLIENT_ID=kBRMAOqIZ7hvpVCaypQLCJvTzkYYIXVt -e USE_AUTH0=true -e AUTH_SUPPORTED_SCOPES='openid profile email api offline_access email_verified' -e NETBIRD_MGMT_API_ENDPOINT=http://localhost:80 -e NETBIRD_MGMT_GRPC_API_ENDPOINT=http://localhost:80  netbird/dashboard-local:latest