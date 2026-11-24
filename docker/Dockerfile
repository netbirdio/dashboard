FROM alpine:3.24

# Minimum nginx with the fixes for the 2026-11-18 HTTP/2 advisories
# (CVE-2026-123007, CVE-2026-123633). Fails the build instead of silently
# installing an older package.
RUN apk add --no-cache bash curl less ca-certificates git tzdata zip gettext \
    'nginx>=1.30.7' curl supervisor certbot-nginx && \
    rm -rf /var/cache/apk/* && mkdir -p /run/nginx

STOPSIGNAL SIGINT
EXPOSE 80
EXPOSE 443
ENTRYPOINT ["/usr/bin/supervisord","-c","/etc/supervisord.conf"]

WORKDIR /usr/share/nginx/html
# copy configuration files
COPY docker/default.conf /etc/nginx/http.d/default.conf
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/init_cert.sh /usr/local/init_cert.sh
COPY docker/init_react_envs.sh /usr/local/init_react_envs.sh
RUN chmod +x /usr/local/init_cert.sh && rm /etc/crontabs/root
RUN chmod +x /usr/local/init_react_envs.sh

# configure supervisor
COPY docker/supervisord.conf /etc/supervisord.conf
# copy build files
COPY out/ /usr/share/nginx/html/