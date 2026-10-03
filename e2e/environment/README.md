# Dashboard E2E environment

Run `bash create-test-env.sh` from this directory, then build and run the
dashboard tests as described in [the E2E guide](../CLAUDE.md).

The default images are `ghcr.io/netbirdio/management-cloud:main` and
`ghcr.io/netbirdio/reverse-proxy:main`. `MANAGEMENT_IMAGE_TAG` and
`REVERSE_PROXY_IMAGE_TAG` select other tags and refresh them during setup.

To run the focused target-access traffic test, check out the matching backend
and dashboard branches, then build both backend images and the dashboard:

```bash
cd /path/to/netbird
docker build -f management/Dockerfile.multistage -t local/netbird-management:target-access .
docker build -f proxy/Dockerfile.multistage -t local/netbird-proxy:target-access .

cd /path/to/dashboard/e2e/environment
MANAGEMENT_IMAGE=local/netbird-management:target-access \
REVERSE_PROXY_IMAGE=local/netbird-proxy:target-access \
MANAGEMENT_DISABLE_GEOLOCATION=true \
bash create-test-env.sh

cd ../..
APP_ENV=test npm run build
npx playwright test --config=e2e/playwright.config.ts reverse-proxy-target-access-traffic.spec.ts
```

Install the dashboard dependencies and Playwright Chromium before running these
commands, following [the E2E guide](../CLAUDE.md). The test creates and edits
targets through the dashboard, then sends real HTTPS requests through the proxy
to a local HTTP upstream. Its direct proxy-cluster target exercises management
and proxy access control without requiring an enrolled peer or an overlay
connection.

Explicit image references take precedence over tags. Setup uses an existing
local image or pulls it if missing; rebuild local images before rerunning after
backend changes. Management images must provide `/go/bin/netbird-mgmt` with
the `management` and `token` commands. The NetBird OSS management image supports
the focused reverse-proxy tests; cloud-specific tests still require the cloud
image. Target access tests require both images to include `access_action`
support and intentionally fail against an older management image that drops it.

The primary proxy's HTTPS listener is published at `https://127.0.0.1:18443`.
Set `REVERSE_PROXY_PORT` before setup to use another host port. The generated
`../playwright.env.json` provides:

| Key | Purpose |
| --- | --- |
| `REVERSE_PROXY_URL` | Local HTTPS address for proxy traffic |
| `REVERSE_PROXY_CA_CERT` | Test CA certificate path, relative to `playwright.env.json` |
| `REVERSE_PROXY_UPSTREAM_HOST` | Runner IP reachable from the proxy container |

Traffic helpers connect to `REVERSE_PROXY_URL`, set the service domain as TLS
servername and HTTP Host, and trust `REVERSE_PROXY_CA_CERT`. TLS verification
stays enabled; public DNS records are unnecessary. A test can bind its own HTTP
upstream on `0.0.0.0` with an ephemeral port and configure a proxy-cluster target
using `REVERSE_PROXY_UPSTREAM_HOST` and that port. This also lets the test count
upstream requests to verify that denied traffic never arrives.

For a focused local run without country selectors, set
`MANAGEMENT_DISABLE_GEOLOCATION=true` to avoid downloading geolocation data.
Leave the default `false` for the full suite. This setting does not relax the
proxy's access-control assertions.

Run `bash clean-test-env.sh` from this directory to remove this Compose stack,
its test data, and generated configuration before setting up another run.
