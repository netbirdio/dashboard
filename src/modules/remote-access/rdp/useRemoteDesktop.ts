import { useCallback, useEffect, useRef, useState } from "react";
import { useIronRDPInputHandler } from "./useIronRDPInputHandler";
import {
  CertificatePromptInfo,
  useRDPCertificateHandler,
} from "./useRDPCertificateHandler";

interface IronError {
  message: string;
  backtrace?: () => string;
}

interface RDPConfig {
  hostname: string;
  port: number;
  username: string;
  password: string;
  domain?: string;
  width?: number;
  height?: number;
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
    resolve: (value: boolean) => void;
    reject: (reason?: any) => void;
  } | null>(null);

  const [rdpSession, setRdpSession] = useState<any>(null);
  const [ironrdpModule, setIronrdpModule] = useState<any>(null);

  const { handleRDCleanPathResponse, acceptCertificate } =
    useRDPCertificateHandler();
  const certificateAccepted = useRef(false);

  const { isActive, focusCanvas } = useIronRDPInputHandler({
    ironrdp: ironrdpModule,
    session: rdpSession,
    canvas: canvasRef.current,
    isConnected: status === RDPStatus.CONNECTED,
  });

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
        setPendingCertificate(null);
        certificatePromiseRef.current = null;
      }
    },
    [],
  );

  /**
   * Set up the global RDPCertificateHandler to intercept certificate prompts
   */
  const setupCertificateHandler = useCallback(() => {
    const originalHandler = (window as any).RDPCertificateHandler;

    (window as any).RDPCertificateHandler = function () {
      this.handleRDCleanPathResponse = async (response: any) => {
        const result = await handleRDCleanPathResponse(response);

        if (result.isValid) {
          return true;
        }

        if (result.needsUserConfirmation && result.promptInfo) {
          setPendingCertificate(result.promptInfo);

          return new Promise((resolve, reject) => {
            certificatePromiseRef.current = { resolve, reject };
          });
        }

        return false;
      };

      if (originalHandler?.prototype) {
        Object.getOwnPropertyNames(originalHandler.prototype).forEach(
          (name) => {
            if (
              name !== "constructor" &&
              name !== "handleRDCleanPathResponse"
            ) {
              this[name] = originalHandler.prototype[name];
            }
          },
        );
      }
    };

    return originalHandler;
  }, [handleRDCleanPathResponse]);

  /**
   * Establish an RDP connection
   */
  const connect = useCallback(
    async (rdpConfig: RDPConfig): Promise<RDPStatus> => {
      if (status === RDPStatus.CONNECTING) return status;

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

        const originalHandler = setupCertificateHandler();

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
          const ironError = err as IronError;
          const errorMessage = ironError.backtrace
            ? ironError.backtrace()
            : "RDP connection failed";
          setError(errorMessage);
          resetState();
          throw Error(errorMessage);
        } finally {
          (window as any).RDPCertificateHandler = originalHandler;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "RDP connection failed";
        setError(errorMessage);
        resetState();
        throw Error(errorMessage);
      }
    },
    [client, status, setupCertificateHandler, resetState],
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

      certificatePromiseRef.current.resolve(true);
      setPendingCertificate(null);
      certificatePromiseRef.current = null;
      certificateAccepted.current = true;
      canvasRef?.current?.focus();
    },
    [pendingCertificate, acceptCertificate],
  );

  /**
   * Reject the pending certificate prompt
   */
  const rejectCertificatePrompt = useCallback(() => {
    if (!certificatePromiseRef.current) return;
    certificatePromiseRef.current.resolve(false);
    setPendingCertificate(null);
    certificatePromiseRef.current = null;
  }, []);

  /**
   * Handle window resize events - reconnect with new dimensions
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
  }, [status, connect]);

  /**
   * Auto accept certificate if previously accepted (for reconnects)
   */
  useEffect(() => {
    if (pendingCertificate && certificateAccepted.current) {
      acceptCertificatePrompt();
    }
  }, [acceptCertificatePrompt, pendingCertificate]);

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
