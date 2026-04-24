FROM nginx:alpine

EXPOSE 80

WORKDIR /usr/share/nginx/html

# Copy nginx configs
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# Copy init script as an entrypoint hook (runs before nginx starts)
COPY docker/init_react_envs.sh /docker-entrypoint.d/40-init-react-envs.sh
RUN chmod +x /docker-entrypoint.d/40-init-react-envs.sh

# Copy static build output
COPY out/ /usr/share/nginx/html/
