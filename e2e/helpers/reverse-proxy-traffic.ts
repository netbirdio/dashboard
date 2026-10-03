import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as path from "path";

const ENV_PATH = path.resolve(__dirname, "../playwright.env.json");
const REQUEST_TIMEOUT_MS = 10_000;

type TrafficEnvironmentFile = {
  REVERSE_PROXY_URL?: string;
  REVERSE_PROXY_CA_CERT?: string;
  REVERSE_PROXY_UPSTREAM_HOST?: string;
};

export type ReverseProxyTrafficEnvironment = {
  proxyUrl: URL;
  ca: Buffer;
  upstreamHost: string;
};

export type EchoedRequest = {
  method: string;
  path: string;
  headers: http.IncomingHttpHeaders;
  body: string;
};

export type EchoUpstream = {
  port: number;
  snapshot: () => EchoedRequest[];
  close: () => Promise<void>;
};

export type ReverseProxyResponse = {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
};

let cachedEnvironment: ReverseProxyTrafficEnvironment | undefined;

/** Load the real-traffic endpoints emitted by create-test-env.sh. */
export function getReverseProxyTrafficEnvironment(): ReverseProxyTrafficEnvironment {
  if (cachedEnvironment) return cachedEnvironment;
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(
      `Missing ${ENV_PATH}; run npm run test:setup before the reverse-proxy traffic spec`,
    );
  }

  const env = JSON.parse(
    fs.readFileSync(ENV_PATH, "utf8"),
  ) as TrafficEnvironmentFile;
  if (
    !env.REVERSE_PROXY_URL ||
    !env.REVERSE_PROXY_CA_CERT ||
    !env.REVERSE_PROXY_UPSTREAM_HOST
  ) {
    throw new Error(
      "playwright.env.json must define REVERSE_PROXY_URL, REVERSE_PROXY_CA_CERT, and REVERSE_PROXY_UPSTREAM_HOST",
    );
  }

  const proxyUrl = new URL(env.REVERSE_PROXY_URL);
  if (proxyUrl.protocol !== "https:") {
    throw new Error("REVERSE_PROXY_URL must use HTTPS");
  }
  const caPath = path.resolve(
    path.dirname(ENV_PATH),
    env.REVERSE_PROXY_CA_CERT,
  );

  cachedEnvironment = {
    proxyUrl,
    ca: fs.readFileSync(caPath),
    upstreamHost: env.REVERSE_PROXY_UPSTREAM_HOST,
  };
  return cachedEnvironment;
}

/** Start a real HTTP backend reachable from the reverse-proxy container. */
export async function startEchoUpstream(): Promise<EchoUpstream> {
  const requests: EchoedRequest[] = [];
  const server = http.createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const echoed: EchoedRequest = {
        method: request.method ?? "",
        path: request.url ?? "",
        headers: { ...request.headers },
        body: Buffer.concat(chunks).toString("utf8"),
      };
      requests.push(echoed);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(echoed));
    });
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(0, "0.0.0.0", () => {
      server.off("error", onError);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Echo upstream did not bind to a TCP port");
  }

  return {
    port: address.port,
    snapshot: () => requests.map((request) => ({ ...request })),
    close: () =>
      new Promise<void>((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

/** Send a certificate-verified HTTPS request through the real proxy listener. */
export async function requestThroughReverseProxy(
  serviceDomain: string,
  requestPath: string,
  headers: Record<string, string> = {},
): Promise<ReverseProxyResponse> {
  const { proxyUrl, ca } = getReverseProxyTrafficEnvironment();

  return new Promise<ReverseProxyResponse>((resolve, reject) => {
    const request = https.request(
      {
        protocol: proxyUrl.protocol,
        hostname: proxyUrl.hostname,
        port: proxyUrl.port || "443",
        method: "GET",
        path: requestPath,
        ca,
        servername: serviceDomain,
        rejectUnauthorized: true,
        agent: false,
        headers: {
          ...headers,
          Host: serviceDomain,
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("error", reject);
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(
        new Error(
          `Timed out requesting https://${serviceDomain}${requestPath}`,
        ),
      );
    });
    request.on("error", reject);
    request.end();
  });
}
