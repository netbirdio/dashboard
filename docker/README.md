# NetBird Dashboard
NetBird Dashboard is NetBirds Management server UI. It allows users to signin, view setup keys and manage peers. This image is **not ready** for production use.
## Tags
```latest``` ```vX.X.X``` not available yet.

```main``` built on every PR being merged to the repository
## How to use this image
HTTP run:
```shell
docker run -d --rm -p 80:80 wiretrustee/dashboard:main
```
Using SSL certificate from Let's Encrypt®:
```shell
docker run -d --rm -p 80:80 -p 443:443 \
  -e LETSENCRYPT_DOMAIN=app.mydomain.com \
  -e LETSENCRYPT_EMAIL=hello@mydomain.com \
  netbirdio/dashboard:main
```
> For SSL generation, you need to run this image in a server with proper public IP and a domain name pointing to it.
## Environment variables
* ```NGINX_SSL_PORT``` Changes the port that Nginx listens to. Defaults to ```443```
* ```NGINX_SSL_CERT``` Provide a pre-generated SSL certificate. Optional
* ```NGINX_SSL_KEY``` Provide a pre-generated SSL certificate key. Optional
* ```LETSENCRYPT_DOMAIN``` Enables Certbot`s client execution for the specified domain. Defaults to ```none```
* ```LETSENCRYPT_EMAIL``` Email used in Certbot`s client execution to register the certificate request. Defaults to ```example@local```