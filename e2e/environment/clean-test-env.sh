#!/bin/bash

check_docker_compose() {
  if command -v docker-compose &> /dev/null
  then
      echo "docker-compose"
      return
  fi
  if docker compose --help &> /dev/null
  then
      echo "docker compose"
      return
  fi

  echo "docker-compose is not installed or not in PATH. Please follow the steps from the official guide: https://docs.docker.com/engine/install/" > /dev/stderr
  exit 1
}

DOCKER_COMPOSE_COMMAND=$(check_docker_compose)

$DOCKER_COMPOSE_COMMAND down --volumes
rm -f docker-compose.yml Caddyfile zitadel.env .env dashboard.env machinekey/zitadel-admin-sa.token turnserver.conf management.json proxy.env proxy-no-ports.env
rm -rf proxy-certs proxy-certs-no-ports
rm -f ../../.test-config.json ../playwright.env.json
rm -f ../fixtures/auth/owner.json ../fixtures/auth/user.json