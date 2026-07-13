#!/bin/bash
set -ex
LETSENCRYPT_DOMAIN=${LETSENCRYPT_DOMAIN:-"none"}
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-"example@local"}
NGINX_SSL_PORT=${NGINX_SSL_PORT:-8443}

# If no domain is provided, skip certbot execution and configuration
if [ "${LETSENCRYPT_DOMAIN}-x" == "none-x" ]; then
    exit 0
fi

# Request a certificate
# this also updates the nginx config file with new SSL entries
certbot -n --nginx --agree-tos --email ${LETSENCRYPT_EMAIL} -d ${LETSENCRYPT_DOMAIN} --https-port ${NGINX_SSL_PORT}
# Add cron job file
cat <<EOF >/etc/crontabs/root
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 */12 * * * certbot -q renew --nginx --https-port ${NGINX_SSL_PORT}
EOF
# start cron daemon
supervisorctl start cron
