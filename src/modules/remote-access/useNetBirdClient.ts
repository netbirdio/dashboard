import { useApiCall } from "@utils/api";
import loadConfig from "@utils/config";
import { getBrowserInfo } from "@utils/helpers";
import { generateKeypair } from "@utils/wireguard";
import { trim } from "lodash";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { IronRDPWASMBridge } from "@/modules/remote-access/rdp/ironrdp-wasm-bridge";
import { RDPCertificateHandler } from "@/modules/remote-access/rdp/rdp-certificate-handler";
import { installWebSocketProxy } from "@/modules/remote-access/rdp/websocket-proxy";

const config = loadConfig();

const WASM_CONFIG = {
  SCRIPT_PATH: "/wasm_exec.js",
  WASM_PATH: config.wasmPath,
  INIT_TIMEOUT: 10000,
  RETRY_DELAY: 100,
} as const;

export enum NetBirdStatus {
  DISCONNECTED = 0,
  CONNECTED = 1,
  CONNECTING = 2,
}

export enum WASMStatus {
  UNINITIALIZED,
  INITIALIZED,
  INITIALIZING,
}

type NetBirdState = {
  status: NetBirdStatus;
  wasmStatus: WASMStatus;
  error: string;
};

class NetBirdStore {
  private state: NetBirdState = {
    status: NetBirdStatus.DISCONNECTED,
    wasmStatus: WASMStatus.UNINITIALIZED,
    error: "",
  };
  private listeners = new Set<() => void>();

  getState = (): NetBirdState => this.state;

  setState = (newState: Partial<NetBirdState>): void => {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((listener) => listener());
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

const netBirdStore = new NetBirdStore();

export const useNetBirdClient = () => {
  const netBirdClient = useRef<any>(null);
  const state = useSyncExternalStore(
    netBirdStore.subscribe,
    netBirdStore.getState,
    netBirdStore.getState,
  );
  const { status, wasmStatus, error } = state;
  const peerRequest = useApiCall(`/peers`);

  const rdpComponents = useRef<{
    bridge: IronRDPWASMBridge | null;
    certificateHandler: typeof RDPCertificateHandler | null;
  }>({ bridge: null, certificateHandler: null });

  const loadWASMRuntime = useCallback((): Promise<void> => {
    if (document.querySelector(`script[src="${WASM_CONFIG.SCRIPT_PATH}"]`)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = WASM_CONFIG.SCRIPT_PATH;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load WASM runtime"));
      document.head.appendChild(script);
    });
  }, []);

  const loadGoClient = useCallback(async (): Promise<void> => {
    if ((window as any).NetBirdClient) return;

    const go = new (window as any).Go();
    const wasmModule = await WebAssembly.instantiateStreaming(
      fetch(WASM_CONFIG.WASM_PATH),
      go.importObject,
    );
    go.run(wasmModule.instance);

    const start = Date.now();
    while (Date.now() - start < WASM_CONFIG.INIT_TIMEOUT) {
      if ((window as any).NetBirdClient) return;
      await new Promise((resolve) =>
        setTimeout(resolve, WASM_CONFIG.RETRY_DELAY),
      );
    }
    throw new Error("NetBird WASM failed to initialize in time");
  }, []);

  const initIronRDP = useCallback(() => {
    if (rdpComponents.current.bridge) return;

    installWebSocketProxy();
    rdpComponents.current = {
      bridge: new IronRDPWASMBridge(),
      certificateHandler: RDPCertificateHandler,
    };
  }, []);

  const initialize = useCallback(async (): Promise<WASMStatus> => {
    const currentStatus = netBirdStore.getState().wasmStatus;
    if (currentStatus === WASMStatus.INITIALIZED) return currentStatus;

    if (currentStatus === WASMStatus.INITIALIZING) {
      while (netBirdStore.getState().wasmStatus === WASMStatus.INITIALIZING) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      const finalStatus = netBirdStore.getState().wasmStatus;
      if (finalStatus === WASMStatus.INITIALIZED) return finalStatus;
      throw new Error("WASM initialization failed");
    }

    netBirdStore.setState({ wasmStatus: WASMStatus.INITIALIZING });
    try {
      await loadWASMRuntime();
      await loadGoClient();
      initIronRDP();
      netBirdStore.setState({ wasmStatus: WASMStatus.INITIALIZED });
      return WASMStatus.INITIALIZED;
    } catch (error) {
      netBirdStore.setState({
        wasmStatus: WASMStatus.UNINITIALIZED,
        error:
          error instanceof Error ? error.message : "Failed to initialize WASM",
      });
      throw error;
    }
  }, [loadWASMRuntime, loadGoClient, initIronRDP]);

  const initializeIronRDP = useCallback(async (): Promise<boolean> => {
    if (!rdpComponents.current.bridge) return false;
    try {
      await rdpComponents.current.bridge.initialize();
      return true;
    } catch {
      return false;
    }
  }, []);

  const connect = useCallback(
    async (privateKey: string): Promise<boolean> => {
      await initialize();

      if (typeof (window as any).NetBirdClient !== "function") {
        netBirdStore.setState({
          status: NetBirdStatus.DISCONNECTED,
          error: "NetBirdClient is not available or not a function",
        });
        return false;
      }

      netBirdStore.setState({ status: NetBirdStatus.CONNECTING });

      try {
        netBirdClient.current = await (window as any).NetBirdClient({
          privateKey,
          logLevel: "warn",
          managementURL: config.apiOrigin,
        });

        await netBirdClient.current.start();
        netBirdStore.setState({ status: NetBirdStatus.CONNECTED });
        return true;
      } catch (error) {
        netBirdStore.setState({
          status: NetBirdStatus.DISCONNECTED,
          error: error instanceof Error ? error.message : "Connection failed",
        });
        console.log(error);
        return false;
      }
    },
    [initialize],
  );

  const disconnect = useCallback(async (): Promise<void> => {
    if (!netBirdClient.current?.stop) {
      throw new Error("Go client not ready");
    }

    netBirdStore.setState({ status: NetBirdStatus.DISCONNECTED });
    await netBirdClient.current.stop();
    netBirdClient.current = null;
    return Promise.resolve();
  }, []);

  const detectSSHServerType = useCallback(
    async (host: string, port: number): Promise<boolean> => {
      if (!netBirdClient.current?.detectSSHServerType) {
        throw new Error("NetBird client not ready");
      }
      return netBirdClient.current.detectSSHServerType(host, port);
    },
    [],
  );

  const createSSHConnection = useCallback(
    async (
      host: string,
      port: number,
      username: string,
      jwtToken?: string,
    ): Promise<any> => {
      if (!netBirdClient.current?.createSSHConnection) {
        throw new Error("Go client not ready");
      }
      return netBirdClient.current.createSSHConnection(host, port, username);
    },
    [],
  );

  const makeRequest = useCallback(async (url: string): Promise<any> => {
    if (!netBirdClient.current?.makeRequest) {
      throw new Error("Go client not ready");
    }
    return netBirdClient.current.makeRequest(url);
  }, []);

  const proxyRequest = useCallback(async (request: any): Promise<any> => {
    if (!netBirdClient.current?.proxyRequest) {
      throw new Error("Go client not ready");
    }
    return netBirdClient.current.proxyRequest(request);
  }, []);

  const setupRDPProxy = useCallback(
    async (hostname: string, port: string): Promise<string> => {
      if (!netBirdClient.current?.setupRDPProxy) {
        throw new Error("Go client not ready");
      }
      return netBirdClient.current.setupRDPProxy(hostname, port);
    },
    [],
  );

  const connectTemporary = useCallback(
    async (peerId: string, rules?: string[]) => {
      const currentStatus = netBirdStore.getState().status;
      if (
        currentStatus === NetBirdStatus.CONNECTING ||
        currentStatus === NetBirdStatus.CONNECTED
      ) {
        return currentStatus === NetBirdStatus.CONNECTED;
      }

      netBirdStore.setState({ status: NetBirdStatus.CONNECTING });

      try {
        const keyPairs = generateKeypair();
        const browser = getBrowserInfo();
        const name =
          browser.name === ""
            ? "browser-client"
            : trim(
                `${browser.name.toLowerCase()}-${browser.version.toLowerCase()}-browser-client`,
              );
        await peerRequest.post(
          {
            name,
            wg_pub_key: keyPairs.publicKey,
            rules: rules ?? ["tcp/22022", "tcp/3389", "tcp/44338"],
          },
          `/${peerId}/temporary-access`,
        );
        return await connect(keyPairs.privateKey);
      } catch (error) {
        netBirdStore.setState({ status: NetBirdStatus.DISCONNECTED });
        throw error;
      }
    },
    [connect, peerRequest],
  );

  useEffect(() => {
    initialize().catch(console.error);
  }, [initialize]);

  return {
    status,
    wasmStatus,
    error,
    client: netBirdClient.current,
    ironRDPBridge: rdpComponents.current.bridge,
    rdpCertificateHandler: rdpComponents.current.certificateHandler,
    initialize,
    initializeIronRDP,
    connect,
    connectTemporary,
    disconnect,
    detectSSHServerType,
    createSSHConnection,
    makeRequest,
    proxyRequest,
    setupRDPProxy,
  };
};
