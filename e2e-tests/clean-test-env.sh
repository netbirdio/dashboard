#!/bin/bash
docker-compose down --volumes
rm -f docker-compose.yml Caddyfile zitadel.env dashboard.env machinekey/zitadel-admin-sa.token turnserver.conf management.json