# NetBird Dashboard

NetBird Dashboard is NetBird's management server UI.

## Tags

Each published image tag also has a rootless variant with the `-rootless`
suffix. For example, `main` is also published as `main-rootless`.

Each tag also has a Red Hat UBI variant with the `-ubi` suffix (for example
`main-ubi`). Stable releases are also tagged `ubi-latest`.

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

### Red Hat UBI

The `-ubi` image behaves like the rootless image (port `8080`, UID `10001`,
GID `0`, no HTTPS) but is built on Red Hat Universal Base Image 9 minimal with
nginx 1.26 from the RHEL AppStream, for Red Hat container certification. It is
published for `linux/amd64` and `linux/arm64` only. License terms are in
`/licenses`.

## Environment variables

- `NGINX_SSL_PORT` changes the port that Nginx listens to. Defaults to `443`.
- `LETSENCRYPT_DOMAIN` enables Certbot for the specified domain. Defaults to
  `none`.
- `LETSENCRYPT_EMAIL` is used to register the certificate request. Defaults to
  `example@local`.

These certificate variables apply only to the standard image.

### Branding

A deployment can show its own name, logo and favicon instead of NetBird's. All
three are optional and independent; whatever is unset keeps the NetBird
default.

- `NETBIRD_BRAND_NAME` replaces "NetBird Dashboard" in the browser tab title.
- `NETBIRD_BRAND_LOGO_URL` replaces the NetBird logo in the header and on the
  setup, onboarding and pending approval screens. The image is scaled to the
  height of the NetBird logo (22 to 24 pixels), so a wide SVG or PNG with a
  transparent background works best on the dark interface.
- `NETBIRD_BRAND_FAVICON_URL` replaces the favicon.

The logo and favicon take an `http(s)` URL or a path to a file mounted into
the container's web root:

```shell
docker run -d --rm \
  -v ./branding:/usr/share/nginx/html/branding:ro \
  -e NETBIRD_BRAND_NAME='Acme Access' \
  -e NETBIRD_BRAND_LOGO_URL=/branding/logo.svg \
  -e NETBIRD_BRAND_FAVICON_URL=/branding/favicon.png \
  ...
```

These settings cover the dashboard only. The sign-in page belongs to the
identity provider and is branded there.
