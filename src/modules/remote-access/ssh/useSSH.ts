import { useOidcAccessToken } from "@axa-fr/react-oidc";
import { useCallback, useRef, useState } from "react";

interface SSHConfig {
  hostname: string;
  port: number;
  username: string;
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
        let requiresJwt = false;
        try {
          requiresJwt = await client.detectSSHServerType(
            config.hostname,
            config.port,
            SSH_DETECTION_TIMEOUT_MS,
          );
          console.log("Detection:", { requiresJwt, hasToken: !!accessToken });
        } catch (detectionErr) {
          console.error(
            "Detection failed, falling back to pubkey:",
            detectionErr,
          );
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
