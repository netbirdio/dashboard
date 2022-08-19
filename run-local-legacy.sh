#!/bin/bash

MGMT_PORT=$1

npm run build
docker build -f docker/Dockerfile -t netbird/dashboard-local:latest .

docker rm -f netbird-dashboard
docker run -d --name netbird-dashboard  \
 -p 3000:80 -p 443:443  \
 -e AUTH0_AUDIENCE=http://localhost:3000/ \
 -e AUTH0_DOMAIN=netbird-localdev.eu.auth0.com  \
 -e AUTH0_CLIENT_ID=kBRMAOqIZ7hvpVCaypQLCJvTzkYYIXVt  \
 -e NETBIRD_MGMT_API_ENDPOINT=http://localhost:$MGMT_PORT  \
 -e NETBIRD_MGMT_GRPC_API_ENDPOINT=http://localhost:$MGMT_PORT  \
 netbird/dashboard-local:latest
