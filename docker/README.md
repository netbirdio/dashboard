# NetBird Dashboard

NetBird Dashboard is NetBird's management server UI.

## Tags

Each published image tag also has a rootless variant with the `-rootless`
suffix. For example, `main` is also published as `main-rootless`.

## How to use this image

HTTP:

```shell
docker run -d --rm -p 80:80 netbirdio/dashboard:main
```

Using an SSL certificate from Let's Encrypt:

```shell
docker run -d --rm -p 80:80 -p 443:443 \
  -e LETSENCRYPT_DOMAIN=app.mydomain.com \
  -e LETSENCRYPT_EMAIL=hello@mydomain.com \
  netbirdio/dashboard:main
```

For certificate generation, the server needs a public IP and a domain name
pointing to it.

### Rootless and OpenShift

The rootless image listens on port `8080`, runs as UID `10001` by default, and
supports OpenShift's arbitrary UID when the container retains GID `0`:

```shell
docker run -d --rm \
  --user 12345:0 \
  -p 8080:8080 \
  -e AUTH_AUTHORITY=https://idp.example.com \
  -e AUTH_CLIENT_ID=netbird-dashboard \
  -e AUTH_AUDIENCE=netbird-dashboard \
  -e AUTH_SUPPORTED_SCOPES='openid profile email' \
  -e USE_AUTH0=false \
  -e NETBIRD_MGMT_API_ENDPOINT=https://api.example.com \
  netbirdio/dashboard:main-rootless
```

The rootless image does not include Certbot or expose HTTPS. Terminate TLS at
the OpenShift Route, Ingress, or another reverse proxy.

## Environment variables

- `NGINX_SSL_PORT` changes the port that Nginx listens to. Defaults to `443`.
- `LETSENCRYPT_DOMAIN` enables Certbot for the specified domain. Defaults to
  `none`.
- `LETSENCRYPT_EMAIL` is used to register the certificate request. Defaults to
  `example@local`.

These certificate variables apply only to the standard image.