import { useCallback, useEffect, useRef, useState } from "react";
import { useIronRDPInputHandler } from "./useIronRDPInputHandler";
import {
  CertificatePromptInfo,
  isUsableFingerprint,
  RDCleanPathResponse,
  useRDPCertificateHandler,
} from "./useRDPCertificateHandler";

interface RDPConfig {
  hostname: string;
  port: number;
  username: string;
  password: string;
  domain?: string;
  width?: number;
  height?: number;
  // dynamicResize enables the Display Control channel and in-session resize.
  // Only reliable against Windows hosts; xrdp mishandles the reactivation, so
  // non-Windows peers fall back to reconnect-on-resize.
  dynamicResize?: boolean;
}

export interface RDPCredentials {
  username: string;
  password: string;
  domain?: string;
  port: number;
}

interface RDPConnection {
  id: string;
  disconnect: (options?: {
    preserveConfig?: boolean;
    preserveCertificateState?: boolean;
  }) => void;
}

export enum RDPStatus {
  DISCONNECTED = 0,
  CONNECTED = 1,
  CONNECTING = 2,
}

export const RDP_DOCS_LINK = "https://docs.netbird.io/how-to/browser-client";

export const useRemoteDesktop = (client: any) => {
  const [status, setStatus] = useState(RDPStatus.DISCONNECTED);
  const [config, setConfig] = useState<RDPConfig | null>(null);
  const [error, setError] = useState("");

  const [pendingCertificate, setPendingCertificate] =
    useState<CertificatePromptInfo | null>(null);

  const session = useRef<RDPConnection | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastConnectedConfigRef = useRef<RDPConfig | null>(null);
  const certificatePromiseRef = useRef<{
    resolve: (accepted: boolean) => void;
  } | null>(null);
  const connectionGeneration = useRef(0);

  const [rdpSession, setRdpSession] = useState<any>(null);
  const [ironrdpModule, setIronrdpModule] = useState<any>(null);

  const { handleRDCleanPathResponse, acceptCertificate } =
    useRDPCertificateHandler();
  const sessionTrustedCertificates = useRef(new Map<string, string>());

  const { isActive, focusCanvas } = useIronRDPInputHandler({
    ironrdp: ironrdpModule,
    session: rdpSession,
    canvas: canvasRef.current,
    isConnected: status === RDPStatus.CONNECTED,
  });

  // The Go proxy holds the TLS handshake until the prompt promise settles,
  // so every path that drops a prompt has to answer it.
  const settlePendingCertificate = useCallback((accepted: boolean) => {
    certificatePromiseRef.current?.resolve(accepted);
    certificatePromiseRef.current = null;
    setPendingCertificate(null);
  }, []);

  /**
   * Reset the RDP state, optionally preserving config and/or certificate state
   */
  const resetState = useCallback(
    (
      options: {
        preserveConfig?: boolean;
        preserveCertificateState?: boolean;
      } = {},
    ) => {
      session.current = null;
      setStatus(RDPStatus.DISCONNECTED);
      setRdpSession(null);
      setIronrdpModule(null);

      if (!options.preserveConfig) {
        setConfig(null);
      }
      setError("");
      if (!options.preserveCertificateState) {
        settlePendingCertificate(false);
      }
    },
    [settlePendingCertificate],
  );

  /**
   * Set up the global RDPCertificateHandler to intercept certificate prompts
   */
  const setupCertificateHandler = useCallback(
    (hostname: string, generation: number) => {
      // A socket from a superseded connect must not prompt under the current one.
      const isCurrent = () => generation === connectionGeneration.current;

      const Handler = class {
        handleRDCleanPathResponse = async (
          response: RDCleanPathResponse,
        ): Promise<boolean> => {
          const result = await handleRDCleanPathResponse(response, hostname);
          if (!isCurrent()) return false;

          if (result.isValid) {
            return true;
          }

          if (result.needsUserConfirmation && result.promptInfo) {
            const { hostname, certificate } = result.promptInfo;
            if (
              isUsableFingerprint(certificate.fingerprint) &&
              sessionTrustedCertificates.current.get(hostname) ===
                certificate.fingerprint
            ) {
              return true;
            }

            certificatePromiseRef.current?.resolve(false);
            setPendingCertificate(result.promptInfo);

            return new Promise<boolean>((resolve) => {
              certificatePromiseRef.current = { resolve };
            });
          }

          return false;
        };
      };

      window.RDPCertificateHandler = Handler;

      // An overlapping connect may have installed its own handler since.
      return () => {
        if (window.RDPCertificateHandler === Handler) {
          delete window.RDPCertificateHandler;
        }
      };
    },
    [handleRDCleanPathResponse],
  );

  /**
   * Establish an RDP connection
   */
  const connect = useCallback(
    async (rdpConfig: RDPConfig): Promise<RDPStatus> => {
      if (status === RDPStatus.CONNECTING) return status;

      const generation = ++connectionGeneration.current;
      settlePendingCertificate(false);
      setStatus(RDPStatus.CONNECTING);
      setConfig(rdpConfig);
      setError("");

      try {
        if (!canvasRef.current) {
          throw new Error("Canvas not available for RDP rendering");
        }

        if (!client?.ironRDPBridge || !client?.initializeIronRDP) {
          throw new Error("IronRDP components not available from client");
        }

        const canvas = canvasRef.current;
        canvas.width = rdpConfig.width || 1024;
        canvas.height = rdpConfig.height || 768;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
        }

        const initialized = await client.initializeIronRDP();
        if (!initialized) {
          throw new Error("Failed to initialize IronRDP");
        }

        const removeCertificateHandler = setupCertificateHandler(
          rdpConfig.hostname,
          generation,
        );

        try {
          const sessionId = await client.ironRDPBridge.connect(
            rdpConfig.hostname,
            rdpConfig.port,
            rdpConfig.username,
            rdpConfig.password,
            rdpConfig.domain,
            canvas,
            true,
            client.client,
            (sessionError: string | null, endedSessionId: string) => {
              // Ignore terminations from superseded sessions (e.g. a resize
              // reconnect) so they can't tear down a newer connection.
              if (endedSessionId !== session.current?.id) return;
              resetState();
              if (sessionError) setError(sessionError);
            },
            rdpConfig.dynamicResize ?? false,
          );

          // Store the ironrdp module and session for the input handler hook
          setIronrdpModule((client.ironRDPBridge as any).ironrdp || null);
          const actualSession = client.ironRDPBridge.getSession(sessionId);
          setRdpSession(actualSession);

          session.current = {
            id: sessionId,
            disconnect: (options = {}) => {
              try {
                if (client.ironRDPBridge && sessionId) {
                  client.ironRDPBridge.disconnect(sessionId);
                }
                resetState(options);
              } catch (err) {
                resetState(options);
              }
            },
          };
          setStatus(RDPStatus.CONNECTED);
          lastConnectedConfigRef.current = rdpConfig;
          canvasRef?.current?.focus();
          return RDPStatus.CONNECTED;
        } catch (err) {
          const errorMessage =
            err instanceof Error && err.message
              ? err.message
              : "RDP connection failed";
          setError(errorMessage);
          resetState();
          throw Error(errorMessage);
        } finally {
          removeCertificateHandler();
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "RDP connection failed";
        setError(errorMessage);
        resetState();
        throw Error(errorMessage);
      }
    },
    [
      client,
      status,
      setupCertificateHandler,
      resetState,
      settlePendingCertificate,
    ],
  );

  /**
   * Accept the pending certificate prompt
   */
  const acceptCertificatePrompt = useCallback(
    (remember: boolean = false) => {
      if (!pendingCertificate || !certificatePromiseRef.current) return;

      acceptCertificate(
        pendingCertificate.hostname,
        pendingCertificate.certificate,
        remember,
      );

      settlePendingCertificate(true);
      sessionTrustedCertificates.current.set(
        pendingCertificate.hostname,
        pendingCertificate.certificate.fingerprint,
      );
      canvasRef?.current?.focus();
    },
    [pendingCertificate, acceptCertificate, settlePendingCertificate],
  );

  /**
   * Reject the pending certificate prompt
   */
  const rejectCertificatePrompt = useCallback(() => {
    settlePendingCertificate(false);
  }, [settlePendingCertificate]);

  // Rejecting fails the handshake, so the pending connect settles
  // and removes its certificate handler.
  useEffect(
    () => () => {
      connectionGeneration.current += 1;
      certificatePromiseRef.current?.resolve(false);
      certificatePromiseRef.current = null;
    },
    [],
  );

  /**
   * Handle window resize events. Hosts that support the Display Control channel
   * (Windows) resize the live session in place; others reconnect with the new
   * dimensions.
   */
  useEffect(() => {
    const handleResize = () => {
      // Only handle resize if we're connected and have a previous config
      if (status !== RDPStatus.CONNECTED || !lastConnectedConfigRef.current) {
        return;
      }

      // Clear any existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      if (lastConnectedConfigRef.current.dynamicResize) {
        // In-session resize via Display Control, no reconnect.
        resizeTimeoutRef.current = setTimeout(() => {
          const width = window.innerWidth;
          const height = window.innerHeight;

          if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
          }

          if (session.current && client?.ironRDPBridge) {
            client.ironRDPBridge.resize(session.current.id, width, height);
          }

          lastConnectedConfigRef.current = {
            ...lastConnectedConfigRef.current!,
            width,
            height,
          };
          canvasRef?.current?.focus();
        }, 200);
        return;
      }

      setIsResizing(true);

      // Debounce resize handling for 1 second
      resizeTimeoutRef.current = setTimeout(async () => {
        try {
          // Disconnect current session
          if (session.current) {
            session.current.disconnect({
              preserveConfig: true,
              preserveCertificateState: true,
            });
          }

          // Wait for cleanup
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Reconnect with new dimensions
          const newConfig = {
            ...lastConnectedConfigRef.current!,
            width: window.innerWidth,
            height: window.innerHeight,
          };

          await connect(newConfig);
        } finally {
          setIsResizing(false);
          canvasRef?.current?.focus();
        }
      }, 1000);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [status, connect, client]);

  return {
    connect,
    status,
    config,
    error,
    isResizing,
    session: session.current,
    canvasRef,

    // Input handler
    inputHandlerActive: isActive,
    focusCanvas,

    // Certificate handling
    pendingCertificate,
    acceptCertificatePrompt,
    rejectCertificatePrompt,
  };
};
