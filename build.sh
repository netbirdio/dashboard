#!/usr/bin/env bash
#
# Build the netbird-dashboard Docker image for linux/amd64 and export it as a
# portable tarball that can be loaded and run on a remote server.
#
# The dashboard image is nginx serving a Next.js *static export*: the Dockerfile
# only COPYs the pre-built out/ directory, so we build out/ on the host first
# (the static files are arch-independent) and then assemble the amd64 image.
#
# Usage:
#   ./build.sh                # build + export netbird-dashboard.tar.gz
#   IMAGE_TAG=v1 ./build.sh   # override the image tag
#   SKIP_BUILD=1 ./build.sh   # reuse an existing out/ (skip npm build)
#
set -euo pipefail

# Always run relative to this script's directory (the project root).
cd "$(dirname "$0")"

IMAGE_NAME="${IMAGE_NAME:-netbird-dashboard}"
IMAGE_TAG="${IMAGE_TAG:-amd64}"
IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
OUTPUT="${OUTPUT:-${IMAGE_NAME}.tar.gz}"

# Build the static export (out/) unless told to reuse an existing one. Next 16
# no longer runs ESLint during `next build`; types are checked by the build via
# tsc (verify separately with `npx tsc --noEmit`).
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  if [[ ! -d node_modules ]]; then
    echo "==> Installing dependencies (npm ci)"
    npm ci
  fi
  echo "==> Building static export (next build) into out/"
  npx next build
fi

if [[ ! -d out ]]; then
  echo "ERROR: out/ not found — the static export did not build." >&2
  exit 1
fi

# The .dockerignore lives under docker/, but Docker reads it from the build
# context root. Stage it for the duration of the build so node_modules/.next
# don't get shipped into the build context.
cleanup() { rm -f .dockerignore; }
trap cleanup EXIT
cp docker/.dockerignore .dockerignore

echo "==> Building ${IMAGE} for linux/amd64"
docker build \
  --platform linux/amd64 \
  -f docker/Dockerfile \
  -t "${IMAGE}" \
  .

echo "==> Exporting ${IMAGE} to ${OUTPUT}"
docker save "${IMAGE}" | gzip > "${OUTPUT}"

echo "==> Done: ${OUTPUT} ($(du -h "${OUTPUT}" | cut -f1))"
echo
echo "Copy and run on the server:"
echo "  scp ${OUTPUT} user@your-server:/tmp/"
echo "  docker load < /tmp/${OUTPUT}"
echo
echo "Run (nginx serves on container port 80). Set the runtime env vars the"
echo "dashboard templates at startup — for the Agent Network onboarding test,"
echo "flip NETBIRD_AGENT_NETWORK_ONLY=true:"
echo "  docker run -d --name ${IMAGE_NAME} --restart unless-stopped \\"
echo "    -p 8080:80 \\"
echo "    -e NETBIRD_MGMT_API_ENDPOINT=https://your-mgmt:443 \\"
echo "    -e AUTH_AUTHORITY=https://your-idp/realms/netbird \\"
echo "    -e AUTH_CLIENT_ID=netbird-dashboard \\"
echo "    -e AUTH_AUDIENCE=netbird-dashboard \\"
echo "    -e AUTH_SUPPORTED_SCOPES='openid profile email' \\"
echo "    -e USE_AUTH0=false \\"
echo "    -e NETBIRD_AGENT_NETWORK_ONLY=true \\"
echo "    ${IMAGE}"
