# Reverse Proxy One-Click Deployment Templates

Source templates for the cloud deploy options in the cluster setup modal
(`src/modules/reverse-proxy/clusters/ClusterCloudDeploy.tsx`). Everything
wraps the same contract as the modal's Docker snippet: inject
`NB_PROXY_TOKEN` + `NB_PROXY_DOMAIN` into the container environment, publish
443/tcp, 80/tcp, and the WireGuard UDP port.

## AWS CloudFormation (`netbird-proxy-cfn.yaml`)

CloudFormation requires templates to be served from S3 (GitHub raw URLs are
rejected), so upload on change:

```bash
aws s3 cp netbird-proxy-cfn.yaml s3://<bucket>/netbird-proxy-cfn.yaml
```

The `CFN_TEMPLATE_URL` constant in `ClusterCloudDeploy.tsx` must point at that
object. The dashboard opens the CloudFormation quick-create form with domain
and management URL pre-filled; the proxy token is entered by the user in the
AWS console (`NoEcho` parameter, kept out of URLs, logs, and stack outputs).

The template launches one EC2 instance (Ubuntu 26.04 resolved via public SSM
parameter), a security group for 443/80/WG, an optional Elastic IP, and boots
the container via Docker Compose from cloud-init. SSH stays disabled unless a
key pair is given; alternatively an IAM instance profile can be attached
(existing one by name, or created by the template with SSM Session Manager
access — creating one requires acknowledging IAM capabilities in the console
form).

## Cloud-init (`netbird-proxy-cloud-init.yaml`)

Canonical bootstrap for VM user data. The Hetzner and DigitalOcean deploy
flows render this same content inline (see `buildCloudInit` in
`ClusterCloudDeploy.tsx`) with the proxy token substituted at deploy time —
keep the two in sync when changing either. Also usable manually:

```bash
hcloud server create --name netbird-proxy --type cx22 --image ubuntu-24.04 \
  --user-data-from-file netbird-proxy.rendered.yaml
```

The token must never be committed or baked into a public image; it is always
injected at deploy time.

## After deployment

Point the proxy domain's DNS records at the instance's public IP. The proxy
issues its ACME certificate (tls-alpn-01 on 443) within about a minute and
registers itself with the management service using the proxy token.
