#!/bin/bash
set -ex

LETSENCRYPT_DOMAIN=${LETSENCRYPT_DOMAIN:-}
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-"example@local"}
NGINX_SSL_CERT=${NGINX_SSL_CERT:-}
NGINX_SSL_KEY=${NGINX_SSL_KEY:-}
NGINX_SSL_PORT=${NGINX_SSL_PORT:-443}
NGINX_CONF="/etc/nginx/http.d/default.conf"

remove_ssl_config() {
    sed -i -E "/ssl_certificate /,/^$/d" "${NGINX_CONF}"
    sed -i -E "/ssl_certificate_key /,/^$/d" "${NGINX_CONF}"
}

# Request a certificate
# this also updates the nginx config file with new SSL entries
if [[ -n "${LETSENCRYPT_DOMAIN}" ]]; then
    echo "Generating SSL certificate using certbot for ${LETSENCRYPT_DOMAIN} with automatic renewal."
    certbot -n --nginx --agree-tos --email "${LETSENCRYPT_EMAIL}" -d "${LETSENCRYPT_DOMAIN}" --https-port "${NGINX_SSL_PORT}"
    # Add cron job file
    cat <<EOF >/etc/crontabs/root
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 */12 * * * certbot -q renew --nginx --https-port "${NGINX_SSL_PORT}"
EOF
    # start cron daemon
    supervisorctl start cron
# Update the nginx config file with the provided SSL entries
elif [[ -n "${NGINX_SSL_CERT}" && -n "${NGINX_SSL_KEY}" ]]; then
    echo "Configuring the provided SSL certificate at ${NGINX_SSL_CERT}"
    remove_ssl_config
    sed -i -E "s|listen [0-9]{1,5} (default_server\|ssl http2);|listen ${NGINX_SSL_PORT} ssl http2;|" "${NGINX_CONF}"
    sed -i -E "s|listen \[::\]:[0-9]{1,5} (default_server\|ssl http2);|listen \[::\]:${NGINX_SSL_PORT} ssl http2;\n\n   ssl_certificate ${NGINX_SSL_CERT};\n   ssl_certificate_key ${NGINX_SSL_KEY};|" "${NGINX_CONF}"
# If the nginx port is provided but no other settings are, update the port
elif [[ "${NGINX_SSL_PORT}" != 443 ]]; then
    echo "Setting nginx listen port."
    remove_ssl_config
    sed -i -E "s|listen [0-9]{1,5} (default_server\|ssl http2);|listen ${NGINX_SSL_PORT} default_server;|" "${NGINX_CONF}"
    sed -i -E "s|listen \[::\]:[0-9]{1,5} (default_server\|ssl http2);|listen \[::\]:${NGINX_SSL_PORT} default_server;|" "${NGINX_CONF}"
else
    echo "No certificates or Letsencrypt domain was provided. Exiting."
    exit 0
fi

/usr/sbin/nginx -s reload
