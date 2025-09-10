FROM alpine:3.14

RUN apk add --no-cache bash curl less ca-certificates git tzdata zip gettext \
    nginx curl supervisor certbot-nginx && \
    rm -rf /var/cache/apk/* && mkdir -p /run/nginx

ENV USER=netbird
ENV GROUPNAME=$USER
ENV UID=1000
ENV GID=1000

RUN addgroup \
    --gid "$GID" \
    "$GROUPNAME" \
&&  adduser \
    --disabled-password \
    --gecos "" \
    --home "$(pwd)" \
    --ingroup "$GROUPNAME" \
    --no-create-home \
    --uid "$UID" \
    $USER \

STOPSIGNAL SIGINT
EXPOSE 8080
EXPOSE 8443
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

# Set permissions for Nginx
RUN chown -R netbird:netbird /var/lib/nginx \
&&  chown -R netbird:netbird /var/log/nginx \
&&  chown -R netbird:netbird /usr/share/nginx \
&&  chown -R netbird:netbird /run/nginx \
&&  chown -R netbird:netbird /etc/nginx

# Set permissions for directories used by letsencrypt certbot
# Set permissions for crontab which will be modified by init_cert.sh
RUN mkdir -p /etc/letsencrypt /var/lib/letsencrypt /var/log/letsencrypt \
&&  chown -R netbird:netbird /etc/crontabs/ \
&&  chown -R netbird:netbird /var/lib/letsencrypt \
&&  chown -R netbird:netbird /var/log/letsencrypt \
&&  chown -R netbird:netbird /etc/letsencrypt

USER netbird
