FROM node:22-alpine

WORKDIR /usr/share/nginx/html

# Copy build files
COPY out/ /usr/share/nginx/html/

# Copy server script
COPY docker/server.js /server.js

EXPOSE 80

CMD ["node", "/server.js"]
