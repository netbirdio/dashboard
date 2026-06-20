#!/bin/bash

set -e

# Tag of the management-cloud image to pull. Override via env var to pin the
# tests to a specific management-cloud build (e.g., a feature branch image).
MANAGEMENT_IMAGE_TAG="${MANAGEMENT_IMAGE_TAG:-main}"
echo "Using ghcr.io/netbirdio/management-cloud:${MANAGEMENT_IMAGE_TAG}"

# Tag of the reverse-proxy image to pull. Override via env var to pin the
# tests to a specific reverse-proxy build (e.g., a feature branch image).
REVERSE_PROXY_IMAGE_TAG="${REVERSE_PROXY_IMAGE_TAG:-main}"
echo "Using ghcr.io/netbirdio/reverse-proxy:${REVERSE_PROXY_IMAGE_TAG}"

handle_request_command_status() {
  PARSED_RESPONSE=$1
  FUNCTION_NAME=$2
  RESPONSE=$3
  if [[ $PARSED_RESPONSE -ne 0 ]]; then
    echo "ERROR calling $FUNCTION_NAME:" $(echo "$RESPONSE" | jq -r '.message') > /dev/stderr
    exit 1
  fi
}

handle_zitadel_request_response() {
  PARSED_RESPONSE=$1
  FUNCTION_NAME=$2
  RESPONSE=$3
  if [[ $PARSED_RESPONSE == "null" ]]; then
    echo "ERROR calling $FUNCTION_NAME:" $(echo "$RESPONSE" | jq -r '.message') > /dev/stderr
    exit 1
  fi
  sleep 1
}

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

check_jq() {
  if ! command -v jq &> /dev/null
  then
    echo "jq is not installed or not in PATH, please install with your package manager. e.g. sudo apt install jq" > /dev/stderr
    exit 1
  fi
}

wait_proxy_cluster() {
  SERVICE_NAME=${1:-reverse-proxy}
  echo -n "Waiting for $SERVICE_NAME to register with management "
  set +e
  local attempts=60
  local i
  for ((i = 1; i <= attempts; i++)); do
    if $DOCKER_COMPOSE_COMMAND logs "$SERVICE_NAME" 2>&1 | grep -q "Initial mapping sync complete"; then
      echo " done"
      set -e
      return
    fi
    echo -n " ."
    sleep 2
  done
  echo ""
  echo "ERROR: $SERVICE_NAME did not register with management after $((attempts * 2))s"
  echo "--- $SERVICE_NAME logs ---"
  $DOCKER_COMPOSE_COMMAND logs --tail=50 "$SERVICE_NAME" || true
  exit 1
}

wait_crdb() {
  set +e
  while true; do
    if $DOCKER_COMPOSE_COMMAND exec -T crdb curl -sf -o /dev/null 'http://localhost:8080/health?ready=1'; then
      break
    fi
    echo -n " ."
    sleep 5
  done
  echo " done"
  set -e
}

init_crdb() {
  echo -e "\nInitializing Zitadel's CockroachDB\n\n"
  $DOCKER_COMPOSE_COMMAND up -d crdb
  echo ""
  # shellcheck disable=SC2028
  echo -n "Waiting cockroachDB  to become ready "
  wait_crdb
  $DOCKER_COMPOSE_COMMAND exec -T crdb /bin/bash -c "cp /cockroach/certs/* /zitadel-certs/ && cockroach cert create-client --overwrite --certs-dir /zitadel-certs/ --ca-key /zitadel-certs/ca.key zitadel_user && chown -R 1000:1000 /zitadel-certs/"
  handle_request_command_status $? "init_crdb failed" ""
}

get_main_ip_address() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    interface=$(route -n get default | grep 'interface:' | awk '{print $2}')
    ip_address=$(ifconfig "$interface" | grep 'inet ' | awk '{print $2}')
  else
    interface=$(ip route | grep default | awk '{print $5}' | head -n 1)
    ip_address=$(ip addr show "$interface" | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1)
  fi

  echo "$ip_address"
}

wait_pat() {
  PAT_PATH=$1
  set +e
  while true; do
    if [[ -f "$PAT_PATH" ]]; then
      break
    fi
    echo -n " ."
    sleep 1
  done
  echo " done"
  set -e
}

wait_api() {
    INSTANCE_URL=$1
    PAT=$2
    set +e
    while true; do
      curl -s --fail -o /dev/null "$INSTANCE_URL/auth/v1/users/me" -H "Authorization: Bearer $PAT"
      if [[ $? -eq 0 ]]; then
        break
      fi
      echo -n " ."
      sleep 1
    done
    echo " done"
    set -e
}

create_new_project() {
  INSTANCE_URL=$1
  PAT=$2
  PROJECT_NAME="NETBIRD"

  RESPONSE=$(
    curl -sS -X POST "$INSTANCE_URL/management/v1/projects" \
      -H "Authorization: Bearer $PAT" \
      -H "Content-Type: application/json" \
      -d '{"name": "'"$PROJECT_NAME"'"}'
  )
  PARSED_RESPONSE=$(echo "$RESPONSE" | jq -r '.id')
  handle_zitadel_request_response "$PARSED_RESPONSE" "create_new_project" "$RESPONSE"
  echo "$PARSED_RESPONSE"
}

create_new_application() {
  INSTANCE_URL=$1
  PAT=$2
  APPLICATION_NAME=$3
  BASE_REDIRECT_URL1=$4
  BASE_REDIRECT_URL2=$5
  LOGOUT_URL=$6
  ZITADEL_DEV_MODE=$7

  RESPONSE=$(
    curl -sS -X POST "$INSTANCE_URL/management/v1/projects/$PROJECT_ID/apps/oidc" \
      -H "Authorization: Bearer $PAT" \
      -H "Content-Type: application/json" \
      -d '{
    "name": "'"$APPLICATION_NAME"'",
    "redirectUris": [
      "'"$BASE_REDIRECT_URL1"'",
      "'"$BASE_REDIRECT_URL2"'"
    ],
    "postLogoutRedirectUris": [
       "'"$LOGOUT_URL"'"
    ],
    "RESPONSETypes": [
      "OIDC_RESPONSE_TYPE_CODE"
    ],
    "grantTypes": [
      "OIDC_GRANT_TYPE_AUTHORIZATION_CODE",
      "OIDC_GRANT_TYPE_REFRESH_TOKEN"
    ],
    "appType": "OIDC_APP_TYPE_USER_AGENT",
    "authMethodType": "OIDC_AUTH_METHOD_TYPE_NONE",
    "version": "OIDC_VERSION_1_0",
    "devMode": '"$ZITADEL_DEV_MODE"',
    "accessTokenType": "OIDC_TOKEN_TYPE_JWT",
    "accessTokenRoleAssertion": true,
    "skipNativeAppSuccessPage": true
  }'
  )

  PARSED_RESPONSE=$(echo "$RESPONSE" | jq -r '.clientId')
  handle_zitadel_request_response "$PARSED_RESPONSE" "create_new_application" "$RESPONSE"
  echo "$PARSED_RESPONSE"
}

create_service_user() {
  INSTANCE_URL=$1
  PAT=$2

  RESPONSE=$(
    curl -sS -X POST "$INSTANCE_URL/management/v1/users/machine" \
      -H "Authorization: Bearer $PAT" \
      -H "Content-Type: application/json" \
      -d '{
            "userName": "netbird-service-account",
            "name": "Netbird Service Account",
            "description": "Netbird Service Account for IDP management",
            "accessTokenType": "ACCESS_TOKEN_TYPE_JWT"
      }'
  )
  PARSED_RESPONSE=$(echo "$RESPONSE" | jq -r '.userId')
  handle_zitadel_request_response "$PARSED_RESPONSE" "create_service_user" "$RESPONSE"
  echo "$PARSED_RESPONSE"
}

create_service_user_secret() {
  INSTANCE_URL=$1
  PAT=$2
  USER_ID=$3

  RESPONSE=$(
    curl -sS -X PUT "$INSTANCE_URL/management/v1/users/$USER_ID/secret" \
      -H "Authorization: Bearer $PAT" \
      -H "Content-Type: application/json" \
      -d '{}'
  )
  SERVICE_USER_CLIENT_ID=$(echo "$RESPONSE" | jq -r '.clientId')
  handle_zitadel_request_response "$SERVICE_USER_CLIENT_ID" "create_service_user_secret_id" "$RESPONSE"
  SERVICE_USER_CLIENT_SECRET=$(echo "$RESPONSE" | jq -r '.clientSecret')
  handle_zitadel_request_response "$SERVICE_USER_CLIENT_SECRET" "create_service_user_secret" "$RESPONSE"
}

add_organization_user_manager() {
  INSTANCE_URL=$1
  PAT=$2
  USER_ID=$3

  RESPONSE=$(
    curl -sS -X POST "$INSTANCE_URL/management/v1/orgs/me/members" \
      -H "Authorization: Bearer $PAT" \
      -H "Content-Type: application/json" \
      -d '{
            "userId": "'"$USER_ID"'",
            "roles": [
              "ORG_USER_MANAGER"
            ]
      }'
  )
  PARSED_RESPONSE=$(echo "$RESPONSE" | jq -r '.details.creationDate')
  handle_zitadel_request_response "$PARSED_RESPONSE" "add_organization_user_manager" "$RESPONSE"
  echo "$PARSED_RESPONSE"
}

create_admin_user() {
    INSTANCE_URL=$1
    PAT=$2
    USERNAME=$3
    PASSWORD=$4
    FIRST_NAME=${5:-"Zitadel"}
    LAST_NAME=${6:-"Admin"}
    RESPONSE=$(
        curl -sS -X POST "$INSTANCE_URL/management/v1/users/human/_import" \
          -H "Authorization: Bearer $PAT" \
          -H "Content-Type: application/json" \
          -d '{
                "userName": "'"$USERNAME"'",
                "profile": {
                  "firstName": "'"$FIRST_NAME"'",
                  "lastName": "'"$LAST_NAME"'"
                },
                "email": {
                  "email": "'"$USERNAME"'",
                  "isEmailVerified": true
                },
                "password": "'"$PASSWORD"'",
                "passwordChangeRequired": false
          }'
      )
      PARSED_RESPONSE=$(echo "$RESPONSE" | jq -r '.userId')
      handle_zitadel_request_response "$PARSED_RESPONSE" "create_admin_user" "$RESPONSE"
      echo "$PARSED_RESPONSE"
}

add_instance_admin() {
  INSTANCE_URL=$1
  PAT=$2
  USER_ID=$3

  RESPONSE=$(
    curl -sS -X POST "$INSTANCE_URL/admin/v1/members" \
      -H "Authorization: Bearer $PAT" \
      -H "Content-Type: application/json" \
      -d '{
            "userId": "'"$USER_ID"'",
            "roles": [
              "IAM_OWNER"
            ]
      }'
  )
  PARSED_RESPONSE=$(echo "$RESPONSE" | jq -r '.details.creationDate')
  handle_zitadel_request_response "$PARSED_RESPONSE" "add_instance_admin" "$RESPONSE"
  echo "$PARSED_RESPONSE"
}

delete_auto_service_user() {
  INSTANCE_URL=$1
  PAT=$2

  RESPONSE=$(
    curl -sS -X GET "$INSTANCE_URL/auth/v1/users/me" \
      -H "Authorization: Bearer $PAT" \
      -H "Content-Type: application/json" \
  )
  USER_ID=$(echo "$RESPONSE" | jq -r '.user.id')
  handle_zitadel_request_response "$USER_ID" "delete_auto_service_user_get_user" "$RESPONSE"

  RESPONSE=$(
      curl -sS -X DELETE "$INSTANCE_URL/admin/v1/members/$USER_ID" \
        -H "Authorization: Bearer $PAT" \
        -H "Content-Type: application/json" \
  )
  PARSED_RESPONSE=$(echo "$RESPONSE" | jq -r '.details.changeDate')
  handle_zitadel_request_response "$PARSED_RESPONSE" "delete_auto_service_user_remove_instance_permissions" "$RESPONSE"

  RESPONSE=$(
      curl -sS -X DELETE "$INSTANCE_URL/management/v1/orgs/me/members/$USER_ID" \
        -H "Authorization: Bearer $PAT" \
        -H "Content-Type: application/json" \
  )
  PARSED_RESPONSE=$(echo "$RESPONSE" | jq -r '.details.changeDate')
  handle_zitadel_request_response "$PARSED_RESPONSE" "delete_auto_service_user_remove_org_permissions" "$RESPONSE"
  echo "$PARSED_RESPONSE"
}

create_proxy_token() {
  TOKEN_NAME=$1
  echo "Creating proxy token '$TOKEN_NAME'..." >&2
  local attempts=30
  local delay=2
  local i
  local out=""
  local tok=""
  for ((i = 1; i <= attempts; i++)); do
    out=$($DOCKER_COMPOSE_COMMAND exec -T management /go/bin/netbird-mgmt token create \
      --name "$TOKEN_NAME" \
      --config /etc/netbird/management.json \
      --log-file console \
      --log-level error 2>&1 || true)

    tok=$(echo "$out" | grep "^Token:" | awk '{print $2}')
    if [ -n "$tok" ]; then
      break
    fi
    echo "  attempt $i/$attempts: management not ready yet, retrying in ${delay}s..." >&2
    sleep "$delay"
  done

  if [ -z "$tok" ]; then
    echo "ERROR: Failed to create proxy token '$TOKEN_NAME' after $attempts attempts" >&2
    echo "Last output from management:" >&2
    echo "$out" >&2
    echo "--- docker compose ps ---" >&2
    $DOCKER_COMPOSE_COMMAND ps >&2 || true
    echo "--- management logs ---" >&2
    $DOCKER_COMPOSE_COMMAND logs --tail=200 management >&2 || true
    exit 1
  fi
  echo "Proxy token '$TOKEN_NAME' created: ${tok:0:10}..." >&2
  echo "$tok"
}

init_proxy_tokens() {
  echo "Waiting for management container to become ready..."
  # Default proxy (supports custom ports)
  NB_PROXY_TOKEN=$(create_proxy_token "test-proxy")
  cat > proxy.env <<PROXYEOF
NB_PROXY_TOKEN=$NB_PROXY_TOKEN
NB_PROXY_ALLOW_INSECURE=true
NB_PROXY_LOG_LEVEL=trace
PROXYEOF

  # Secondary proxy (custom ports disabled)
  NB_PROXY_TOKEN_NO_PORTS=$(create_proxy_token "test-proxy-no-ports")
  cat > proxy-no-ports.env <<PROXYEOF
NB_PROXY_TOKEN=$NB_PROXY_TOKEN_NO_PORTS
NB_PROXY_ALLOW_INSECURE=true
PROXYEOF
}

init_zitadel() {
  echo -e "\nInitializing Zitadel with NetBird's applications\n"
  INSTANCE_URL="$NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN:$NETBIRD_PORT"

  TOKEN_PATH=./machinekey/zitadel-admin-sa.token

  echo -n "Waiting for Zitadel's PAT to be created "
  wait_pat "$TOKEN_PATH"
  echo "Reading Zitadel PAT"
  PAT=$(cat $TOKEN_PATH)
  if [ "$PAT" = "null" ]; then
    echo "Failed requesting getting Zitadel PAT"
    exit 1
  fi

  echo -n "Waiting for Zitadel to become ready "
  wait_api "$INSTANCE_URL" "$PAT"

  #  create the zitadel project
  echo "Creating new zitadel project"
  PROJECT_ID=$(create_new_project "$INSTANCE_URL" "$PAT")

  ZITADEL_DEV_MODE=false
  BASE_REDIRECT_URL=$NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN
  if [[ $NETBIRD_HTTP_PROTOCOL == "http" ]]; then
    ZITADEL_DEV_MODE=true
  fi

  # create zitadel spa applications
  echo "Creating new Zitadel SPA Dashboard application"
  DASHBOARD_APPLICATION_CLIENT_ID=$(create_new_application "$INSTANCE_URL" "$PAT" "Dashboard" "http://localhost:1337/nb-auth" "http://localhost:1337/nb-silent-auth" "http://localhost:1337/" "true")

  echo "Creating new Zitadel SPA Cli application"
  CLI_APPLICATION_CLIENT_ID=$(create_new_application "$INSTANCE_URL" "$PAT" "Cli" "http://localhost:53000/" "http://localhost:54000/" "http://localhost:53000/" "true")

  MACHINE_USER_ID=$(create_service_user "$INSTANCE_URL" "$PAT")

  SERVICE_USER_CLIENT_ID="null"
  SERVICE_USER_CLIENT_SECRET="null"

  create_service_user_secret "$INSTANCE_URL" "$PAT" "$MACHINE_USER_ID"

  DATE=$(add_organization_user_manager "$INSTANCE_URL" "$PAT" "$MACHINE_USER_ID")

  ZITADEL_ADMIN_USERNAME="owner@localhost.test"
  ZITADEL_ADMIN_PASSWORD="testMe123@"

  HUMAN_USER_ID=$(create_admin_user "$INSTANCE_URL" "$PAT" "$ZITADEL_ADMIN_USERNAME" "$ZITADEL_ADMIN_PASSWORD")

  DATE="null"

  DATE=$(add_instance_admin "$INSTANCE_URL" "$PAT" "$HUMAN_USER_ID")

  # Create a second user for role-based testing (e.g., Billing Admin)
  ZITADEL_SECOND_USERNAME="user@localhost.test"
  ZITADEL_SECOND_PASSWORD="testMe123@"

  SECOND_USER_ID=$(create_admin_user "$INSTANCE_URL" "$PAT" "$ZITADEL_SECOND_USERNAME" "$ZITADEL_SECOND_PASSWORD" "Zitadel" "User")
  DATE=$(add_instance_admin "$INSTANCE_URL" "$PAT" "$SECOND_USER_ID")

  DATE="null"
  DATE=$(delete_auto_service_user "$INSTANCE_URL" "$PAT")
  if [ "$DATE" = "null" ]; then
      echo "Failed deleting auto service user"
      echo "Please remove it manually"
  fi

  export NETBIRD_AUTH_CLIENT_ID=$DASHBOARD_APPLICATION_CLIENT_ID
  export NETBIRD_AUTH_CLIENT_ID_CLI=$CLI_APPLICATION_CLIENT_ID
  export NETBIRD_IDP_MGMT_CLIENT_ID=$SERVICE_USER_CLIENT_ID
  export NETBIRD_IDP_MGMT_CLIENT_SECRET=$SERVICE_USER_CLIENT_SECRET
  export ZITADEL_ADMIN_USERNAME
  export ZITADEL_ADMIN_PASSWORD
}

check_nb_domain() {
  DOMAIN=$1
  if [ "$DOMAIN-x" == "-x" ]; then
    echo "The NETBIRD_DOMAIN variable cannot be empty." > /dev/stderr
    return 1
  fi

  if [ "$DOMAIN" == "netbird.example.com" ]; then
    echo "The NETBIRD_DOMAIN cannot be netbird.example.com" > /dev/stderr
    return 1
  fi
  return 0
}

read_nb_domain() {
  READ_NETBIRD_DOMAIN=""
  echo -n "Enter the domain you want to use for NetBird (e.g. netbird.my-domain.com): " > /dev/stderr
  read -r READ_NETBIRD_DOMAIN < /dev/tty
  if ! check_nb_domain "$READ_NETBIRD_DOMAIN"; then
    read_nb_domain
  fi
  echo "$READ_NETBIRD_DOMAIN"
}

initEnvironment() {
  CADDY_SECURE_DOMAIN=""
  ZITADEL_EXTERNALSECURE="false"
  ZITADEL_TLS_MODE="disabled"
  ZITADEL_MASTERKEY="$(openssl rand -base64 32 | head -c 32)"
  NETBIRD_PORT=33080
  NETBIRD_HTTP_PROTOCOL="http"
  TURN_USER="self"
  TURN_PASSWORD=$(openssl rand -base64 32 | sed 's/=//g')
  TURN_MIN_PORT=49152
  TURN_MAX_PORT=65535

  NETBIRD_DOMAIN=$(get_main_ip_address)

  if [[ "$OSTYPE" == "darwin"* ]]; then
      ZIDATE_TOKEN_EXPIRATION_DATE=$(date -u -v+30M "+%Y-%m-%dT%H:%M:%SZ")
  else
      ZIDATE_TOKEN_EXPIRATION_DATE=$(date -u -d "+30 minutes" "+%Y-%m-%dT%H:%M:%SZ")
  fi

  check_jq

  DOCKER_COMPOSE_COMMAND=$(check_docker_compose)

  if [ -f zitadel.env ]; then
    echo "Generated files already exist, if you want to reinitialize the environment, please remove them first."
    echo "You can use the following commands:"
    echo "  $DOCKER_COMPOSE_COMMAND down --volumes # to remove all containers and volumes"
    echo "  rm -f docker-compose.yml Caddyfile zitadel.env dashboard.env machinekey/zitadel-admin-sa.token turnserver.conf management.json proxy.env proxy-no-ports.env && rm -rf proxy-certs proxy-certs-no-ports"
    echo "Be aware that this will remove all data from the database, and you will have to reconfigure the dashboard."
    exit 1
  fi

  echo Rendering initial files...
  renderDockerCompose > docker-compose.yml
  renderCaddyfile > Caddyfile
  renderZitadelEnv > zitadel.env
  echo "" > turnserver.conf
  echo "" > management.json
  echo "" > proxy.env
  echo "" > proxy-no-ports.env

  mkdir -p machinekey
  chmod 777 machinekey

  init_crdb

  echo -e "\nStarting Zidatel IDP for user management\n\n"
  $DOCKER_COMPOSE_COMMAND up -d caddy zitadel
  init_zitadel

  echo -e "\nRendering NetBird files...\n"
  renderTurnServerConf > turnserver.conf
  renderManagementJson > management.json
  renderDashboardEnv > "../../.test-config.json"

  echo -e "\nRendering Playwright environment file...\n"
  renderPlaywrightEnv > "../playwright.env.json"

  echo -e "\nPulling latest images...\n"
  docker pull "ghcr.io/netbirdio/management-cloud:${MANAGEMENT_IMAGE_TAG}"
  docker pull "ghcr.io/netbirdio/reverse-proxy:${REVERSE_PROXY_IMAGE_TAG}"

  # Pre-create the proxy cert directories BEFORE starting containers so that
  # docker's bind-mounts (./proxy-certs and ./proxy-certs-no-ports) reuse our
  # runner-owned dirs instead of creating root-owned ones, which would
  # prevent openssl from writing the generated keys/certs below. Each proxy
  # gets its own cert dir so it registers with a distinct identity (a shared
  # cert collapses both proxies onto one proxy ID and management superseding
  # flaps cluster registration).
  mkdir -p proxy-certs proxy-certs-no-ports

  echo -e "\nStarting NetBird services\n"
  $DOCKER_COMPOSE_COMMAND up -d

  echo -e "\nWaiting for management to be ready...\n"
  sleep 5

  echo -e "\nGenerating self-signed TLS certificates for reverse proxies...\n"
  openssl req -x509 -newkey rsa:2048 -keyout proxy-certs/tls.key -out proxy-certs/tls.crt \
    -days 365 -nodes -subj "/CN=example.com" \
    -addext "subjectAltName=DNS:example.com,DNS:*.example.com,DNS:noports.example.com,DNS:*.noports.example.com"
  chmod 644 proxy-certs/tls.key proxy-certs/tls.crt
  openssl req -x509 -newkey rsa:2048 -keyout proxy-certs-no-ports/tls.key -out proxy-certs-no-ports/tls.crt \
    -days 365 -nodes -subj "/CN=noports.example.com" \
    -addext "subjectAltName=DNS:noports.example.com,DNS:*.noports.example.com"
  chmod 644 proxy-certs-no-ports/tls.key proxy-certs-no-ports/tls.crt

  echo -e "\nCreating proxy access tokens...\n"
  init_proxy_tokens

  echo -e "\nStarting reverse proxy services...\n"
  $DOCKER_COMPOSE_COMMAND up -d reverse-proxy reverse-proxy-no-ports

  echo -e "\nWaiting for reverse proxies to register with management...\n"
  wait_proxy_cluster reverse-proxy
  wait_proxy_cluster reverse-proxy-no-ports

  echo -e "\nDone!\n"
  echo "Run 'npm run test:dev' to start the dashboard at http://localhost:1337"
  echo "Management API is at $NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN:$NETBIRD_PORT"
  echo "Login with the following credentials:"
  echo "Username: $ZITADEL_ADMIN_USERNAME" | tee .env
  echo "Password: $ZITADEL_ADMIN_PASSWORD" | tee -a .env
}

renderCaddyfile() {
  cat <<EOF
{
  debug
	servers :80,:443 {
    protocols h1 h2c
  }
}

:80${CADDY_SECURE_DOMAIN} {
    # Signal
    reverse_proxy /signalexchange.SignalExchange/* h2c://signal:10000
    # Management
    reverse_proxy /api/* management:80
    reverse_proxy /management.ManagementService/* h2c://management:80
    # Zitadel
    reverse_proxy /zitadel.admin.v1.AdminService/* h2c://zitadel:8080
    reverse_proxy /admin/v1/* h2c://zitadel:8080
    reverse_proxy /zitadel.auth.v1.AuthService/* h2c://zitadel:8080
    reverse_proxy /auth/v1/* h2c://zitadel:8080
    reverse_proxy /zitadel.management.v1.ManagementService/* h2c://zitadel:8080
    reverse_proxy /management/v1/* h2c://zitadel:8080
    reverse_proxy /zitadel.system.v1.SystemService/* h2c://zitadel:8080
    reverse_proxy /system/v1/* h2c://zitadel:8080
    reverse_proxy /assets/v1/* h2c://zitadel:8080
    reverse_proxy /ui/* h2c://zitadel:8080
    reverse_proxy /oidc/v1/* h2c://zitadel:8080
    reverse_proxy /saml/v2/* h2c://zitadel:8080
    reverse_proxy /oauth/v2/* h2c://zitadel:8080
    reverse_proxy /.well-known/openid-configuration h2c://zitadel:8080
    reverse_proxy /openapi/* h2c://zitadel:8080
    reverse_proxy /debug/* h2c://zitadel:8080
    # Dashboard
    reverse_proxy /* dashboard:80
}
EOF
}

renderTurnServerConf() {
  cat <<EOF
listening-port=3478
tls-listening-port=5349
min-port=$TURN_MIN_PORT
max-port=$TURN_MAX_PORT
fingerprint
lt-cred-mech
user=$TURN_USER:$TURN_PASSWORD
realm=netbird.io
cert=/etc/coturn/certs/cert.pem
pkey=/etc/coturn/private/privkey.pem
log-file=stdout
no-software-attribute
pidfile="/var/tmp/turnserver.pid"
no-cli
EOF
}

renderManagementJson() {
  cat <<EOF
{
    "StoreConfig": {
        "Engine": "postgres"
    },
    "Stuns": [
        {
            "Proto": "udp",
            "URI": "stun:$NETBIRD_DOMAIN:3478"
        }
    ],
    "TURNConfig": {
        "Turns": [
            {
                "Proto": "udp",
                "URI": "turn:$NETBIRD_DOMAIN:3478",
                "Username": "$TURN_USER",
                "Password": "$TURN_PASSWORD"
            }
        ],
        "TimeBasedCredentials": false
    },
    "Signal": {
        "Proto": "$NETBIRD_HTTP_PROTOCOL",
        "URI": "$NETBIRD_DOMAIN:$NETBIRD_PORT"
    },
    "HttpConfig": {
        "AuthIssuer": "$NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN:$NETBIRD_PORT",
        "AuthAudience": "$NETBIRD_AUTH_CLIENT_ID",
        "OIDCConfigEndpoint":"$NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN:$NETBIRD_PORT/.well-known/openid-configuration"
    },
    "IdpManagerConfig": {
        "ManagerType": "zitadel",
        "ClientConfig": {
            "Issuer": "$NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN:$NETBIRD_PORT",
            "TokenEndpoint": "$NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN:$NETBIRD_PORT/oauth/v2/token",
            "ClientID": "$NETBIRD_IDP_MGMT_CLIENT_ID",
            "ClientSecret": "$NETBIRD_IDP_MGMT_CLIENT_SECRET",
            "GrantType": "client_credentials"
        },
        "ExtraConfig": {
            "ManagementEndpoint": "$NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN:$NETBIRD_PORT/management/v1"
        }
     },
    "PKCEAuthorizationFlow": {
        "ProviderConfig": {
            "Audience": "$NETBIRD_AUTH_CLIENT_ID_CLI",
            "ClientID": "$NETBIRD_AUTH_CLIENT_ID_CLI",
            "Scope": "openid profile email offline_access",
            "RedirectURLs": ["http://localhost:53000/","http://localhost:54000/"]
        }
    }
}
EOF
}

renderDashboardEnv() {
  cat <<EOF
{
  "auth0Auth": "false",
  "authAuthority": "$NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN:$NETBIRD_PORT",
  "authClientId": "$NETBIRD_AUTH_CLIENT_ID",
  "authScopesSupported": "openid profile email offline_access",
  "authAudience": "$NETBIRD_AUTH_CLIENT_ID",
  "apiOrigin": "$NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN:$NETBIRD_PORT",
  "grpcApiOrigin": "$NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN:$NETBIRD_PORT",
  "redirectURI": "/nb-auth",
  "silentRedirectURI": "/nb-silent-auth"
}
EOF
}

renderZitadelEnv() {
  cat <<EOF
ZITADEL_LOG_LEVEL=debug
ZITADEL_MASTERKEY=$ZITADEL_MASTERKEY
ZITADEL_DATABASE_COCKROACH_HOST=crdb
ZITADEL_DATABASE_COCKROACH_USER_USERNAME=zitadel_user
ZITADEL_DATABASE_COCKROACH_USER_SSL_MODE=verify-full
ZITADEL_DATABASE_COCKROACH_USER_SSL_ROOTCERT="/crdb-certs/ca.crt"
ZITADEL_DATABASE_COCKROACH_USER_SSL_CERT="/crdb-certs/client.zitadel_user.crt"
ZITADEL_DATABASE_COCKROACH_USER_SSL_KEY="/crdb-certs/client.zitadel_user.key"
ZITADEL_DATABASE_COCKROACH_ADMIN_SSL_MODE=verify-full
ZITADEL_DATABASE_COCKROACH_ADMIN_SSL_ROOTCERT="/crdb-certs/ca.crt"
ZITADEL_DATABASE_COCKROACH_ADMIN_SSL_CERT="/crdb-certs/client.root.crt"
ZITADEL_DATABASE_COCKROACH_ADMIN_SSL_KEY="/crdb-certs/client.root.key"
ZITADEL_EXTERNALSECURE=$ZITADEL_EXTERNALSECURE
ZITADEL_TLS_ENABLED="false"
ZITADEL_EXTERNALPORT=$NETBIRD_PORT
ZITADEL_EXTERNALDOMAIN=$NETBIRD_DOMAIN
ZITADEL_FIRSTINSTANCE_PATPATH=/machinekey/zitadel-admin-sa.token
ZITADEL_FIRSTINSTANCE_ORG_MACHINE_MACHINE_USERNAME=zitadel-admin-sa
ZITADEL_FIRSTINSTANCE_ORG_MACHINE_MACHINE_NAME=Admin
ZITADEL_FIRSTINSTANCE_ORG_MACHINE_PAT_SCOPES=openid
ZITADEL_FIRSTINSTANCE_ORG_MACHINE_PAT_EXPIRATIONDATE=$ZIDATE_TOKEN_EXPIRATION_DATE
EOF
}

renderDockerCompose() {
  cat <<EOF
version: "3.4"
services:
  # Caddy reverse proxy
  caddy:
    image: caddy
    restart: unless-stopped
    networks: [ netbird ]
    ports:
      - '33443:443'
      - '33080:80'
      - '33880:8080'
    volumes:
      - netbird_caddy_data:/data
      - ./Caddyfile:/etc/caddy/Caddyfile
  # Management
  management:
    image: ghcr.io/netbirdio/management-cloud:${MANAGEMENT_IMAGE_TAG}
    restart: unless-stopped
    networks: [netbird]
    environment:
     - NETBIRD_STORE_ENGINE_POSTGRES_DSN=host=postgres user=netbird password=netbird dbname=netbird port=5432
     - NB_TRAFFIC_EVENT_POSTGRES_DSN=host=postgres user=netbird password=netbird dbname=netbird port=5432
     - NETBIRD_STORE_CONFIG_ENGINE=postgres
     - NB_TRAFFIC_EVENT_STORE_ENGINE=postgres
     - NB_LICENSE_KEY=${NB_LICENSE_KEY}
     - NB_TRAFFIC_FLOW_ADDRESS=http://127.0.0.1:8084
     - NETBIRD_DATADIR=/var/lib/netbird/
     - NETBIRD_ENCRYPTION_KEY=saFhCwIBtO+4QfRqMA19kKYqNPSrtXq7+TVWfHax+3I=
     - NETBIRD_LICENSE_SERVER_BASE_URL=${NETBIRD_LICENSE_SERVER_BASE_URL}
     - NB_TRAFFIC_FLOW_INTERVAL=20s
     - NB_SINGLE_INSTANCE_MODE=true
    volumes:
      - netbird_management:/var/lib/netbird
      - ./management.json:/etc/netbird/management.json
    command: [
      "--port", "80",
      "--log-file", "console",
      "--log-level", "trace",
      "--disable-anonymous-metrics=false",
      "--single-account-mode-domain=netbird.selfhosted",
      "--dns-domain=netbird.selfhosted",
      "--idp-sign-key-refresh-enabled",
    ]
    depends_on:
        postgres:
          condition: 'service_healthy'
  # PostgreSQL for management
  postgres:
    image: postgres:17
    restart: unless-stopped
    networks: [netbird]
    environment:
      - POSTGRES_USER=netbird
      - POSTGRES_PASSWORD=netbird
      - POSTGRES_DB=netbird
    volumes:
      - netbird_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U netbird"]
      interval: 10s
      timeout: 5s
      retries: 5
  # Zitadel - identity provider
  zitadel:
    restart: 'always'
    networks: [netbird]
    image: 'ghcr.io/zitadel/zitadel:v2.31.3'
    command: 'start-from-init --masterkeyFromEnv --tlsMode $ZITADEL_TLS_MODE'
    env_file:
      - ./zitadel.env
    depends_on:
      crdb:
        condition: 'service_healthy'
    volumes:
      - ./machinekey:/machinekey
      - netbird_zitadel_certs:/crdb-certs:ro
  # Reverse proxy (supports custom listen ports for UDP/TCP)
  reverse-proxy:
    image: ghcr.io/netbirdio/reverse-proxy:${REVERSE_PROXY_IMAGE_TAG}
    restart: unless-stopped
    networks: [netbird]
    env_file:
      - ./proxy.env
    volumes:
      - ./proxy-certs:/certs:ro
    command: [
      "--mgmt", "http://management:80",
      "--addr", "0.0.0.0:8443",
      "--domain", "example.com",
      "--cert-dir", "/certs",
      "--debug-endpoint",
      "--debug-endpoint-addr", "0.0.0.0:8444",
      "--health-addr", "0.0.0.0:8080",
      "--log-level", "debug",
    ]
    depends_on:
      - management
  # Reverse proxy with custom ports disabled (auto-assigned listen ports only)
  reverse-proxy-no-ports:
    image: ghcr.io/netbirdio/reverse-proxy:${REVERSE_PROXY_IMAGE_TAG}
    restart: unless-stopped
    networks: [netbird]
    env_file:
      - ./proxy-no-ports.env
    volumes:
      # Distinct cert dir so this proxy has a distinct identity from the
      # primary proxy; a shared cert makes both register under the same
      # proxy ID and management superseding kicks one off in a loop, which
      # makes cluster registration (and the reverse-proxy suite) flaky.
      - ./proxy-certs-no-ports:/certs:ro
    command: [
      "--mgmt", "http://management:80",
      "--addr", "0.0.0.0:9443",
      "--domain", "noports.example.com",
      "--cert-dir", "/certs",
      "--debug-endpoint",
      "--debug-endpoint-addr", "0.0.0.0:9444",
      "--health-addr", "0.0.0.0:9080",
      "--log-level", "debug",
      "--supports-custom-ports=false",
    ]
    depends_on:
      - management
  # CockroachDB for zitadel
  crdb:
    restart: 'always'
    networks: [netbird]
    image: 'cockroachdb/cockroach:v22.2.2'
    command: 'start-single-node --advertise-addr crdb'
    volumes:
      - netbird_crdb_data:/cockroach/cockroach-data
      - netbird_crdb_certs:/cockroach/certs
      - netbird_zitadel_certs:/zitadel-certs
    healthcheck:
      test: [ "CMD", "curl", "-f", "http://localhost:8080/health?ready=1" ]
      interval: '10s'
      timeout: '30s'
      retries: 5
      start_period: '20s'

volumes:
  netbird_management:
  netbird_caddy_data:
  netbird_crdb_data:
  netbird_crdb_certs:
  netbird_zitadel_certs:
  netbird_postgres_data:

networks:
  netbird:
EOF
}

renderPlaywrightEnv() {
  cat <<EOF
{
  "ZITADEL_URL": "$NETBIRD_HTTP_PROTOCOL://$NETBIRD_DOMAIN:$NETBIRD_PORT",
  "BASE_URL": "http://localhost:1337"
}
EOF
}

initEnvironment