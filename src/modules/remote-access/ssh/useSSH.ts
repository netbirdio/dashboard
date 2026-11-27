import { useCallback, useRef, useState } from "react";
import { useOidcAccessToken } from "@axa-fr/react-oidc";

interface SSHConfig {
  hostname: string;
  port: number;
  username: string;
  ipVersion?: string;
}

interface SSHConnection {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  close: () => void;
  ondata: ((data: Uint8Array) => void) | null;
  onclose: (() => void) | null;
}

export enum SSHStatus {
  DISCONNECTED = 0,
  CONNECTED = 1,
  CONNECTING = 2,
}

export const SSH_DOCS_LINK =
  "https://docs.netbird.io/how-to/browser-client#ssh-connection";

const SSH_DETECTION_TIMEOUT_MS = 20000;
// A cold peer connection (lazy wake, relay fallback) can take longer than one
// probe, and the probe itself is what triggers it. Keep probing until the
// budget is spent instead of guessing the server type.
const SSH_DETECTION_BUDGET_MS = 60000;
const SSH_DETECTION_RETRY_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useSSH = (client: any) => {
  const [status, setStatus] = useState(SSHStatus.DISCONNECTED);
  const [config, setConfig] = useState<SSHConfig | null>(null);
  const session = useRef<SSHConnection | null>(null);
  const [error, setError] = useState("");
  const { accessToken } = useOidcAccessToken();

  const connect = useCallback(
    async (config: SSHConfig): Promise<SSHStatus> => {
      if (status === SSHStatus.CONNECTED || status === SSHStatus.CONNECTING)
        return status;

      setStatus(SSHStatus.CONNECTING);
      setConfig(config);
      setError("");

      try {
        const deadline = Date.now() + SSH_DETECTION_BUDGET_MS;
        let requiresJwt: boolean | undefined;
        let lastErr: unknown;
        while (requiresJwt === undefined) {
          try {
            requiresJwt = await client.detectSSHServerType(
              config.hostname,
              config.port,
              SSH_DETECTION_TIMEOUT_MS,
            );
            console.log("Detection:", { requiresJwt, hasToken: !!accessToken });
          } catch (detectionErr) {
            lastErr = detectionErr;
            console.warn("Detection attempt failed, retrying:", detectionErr);
            if (Date.now() >= deadline) break;
            await sleep(SSH_DETECTION_RETRY_DELAY_MS);
          }
        }
        if (requiresJwt === undefined) {
          throw new Error(`SSH server detection failed: ${lastErr}`);
        }

        if (requiresJwt && !accessToken) {
          console.error("No access token available");
          setError("No access token available");
          setStatus(SSHStatus.DISCONNECTED);
          setConfig(null);
          return SSHStatus.DISCONNECTED;
        }

        const ssh = await client.createSSHConnection(
          config.hostname,
          config.port,
          config.username,
          requiresJwt ? accessToken : undefined,
          config.ipVersion,
        );

        ssh.onclose = () => {
          setStatus(SSHStatus.DISCONNECTED);
          setConfig(null);
          session.current = null;
        };

        session.current = ssh;

        setStatus(SSHStatus.CONNECTED);
        return SSHStatus.CONNECTED;
      } catch (err) {
        console.error("Connection failed:", err);
        session.current = null;
        setStatus(SSHStatus.DISCONNECTED);
        setError("SSH connection failed. Check the console for details.");
        setConfig(null);
        return SSHStatus.DISCONNECTED;
      }
    },
    [client, status, accessToken],
  );

  const disconnect = useCallback(() => {
    if (session.current) {
      session.current.close();
      session.current = null;
      setStatus(SSHStatus.DISCONNECTED);
      setConfig(null);
    }
  }, []);

  return {
    connect,
    error,
    status,
    config,
    session: session.current,
    disconnect,
  };
};
