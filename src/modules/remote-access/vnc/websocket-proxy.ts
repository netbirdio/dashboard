/**
 * WebSocket Proxy for VNC connections.
 * Provides a WebSocket interface that routes through the NetBird VNC proxy.
 * noVNC opens a WebSocket to vnc.proxy.local, which this proxy intercepts
 * and bridges to the Go WASM VNC proxy.
 */

declare global {
  interface Window {
    handleVNCWebSocket?: (ws: VNCProxyWebSocket, proxyID: string) => void;
  }
}

export class VNCProxyWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  url: string;
  readyState: number;
  readonly protocol: string = "";
  readonly extensions: string = "";
  readonly bufferedAmount: number = 0;
  readonly binaryType: BinaryType = "arraybuffer";

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  // Called from Go side to deliver data.
  onGoMessage?: (data: Uint8Array) => void;
  // Called from Go side to signal close.
  onGoClose?: () => void;

  private proxyID: string;

  constructor(url: string) {
    super();
    this.url = url;
    this.readyState = VNCProxyWebSocket.CONNECTING;

    const match = url.match(/vnc\.proxy\.local\/(.+)/);
    this.proxyID = match?.[1] || "default";

    activeProxySockets.set(this.proxyID, this);

    void this.connect();
  }

  get CONNECTING() { return VNCProxyWebSocket.CONNECTING; }
  get OPEN() { return VNCProxyWebSocket.OPEN; }
  get CLOSING() { return VNCProxyWebSocket.CLOSING; }
  get CLOSED() { return VNCProxyWebSocket.CLOSED; }

  private connect(): void {
    // Defer to next microtask so noVNC's Websock class can attach onopen/onmessage
    // handlers after the constructor returns. Without this, the open event fires
    // before noVNC is listening and the RFB state machine never initializes.
    setTimeout(() => {
      try {
        // handleVNCWebSocket_<proxyID> is registered on `window` by the Go
        // WASM side in client/wasm/internal/vnc/proxy.go when createVNCProxy
        // is called.
        const handler = (window as any)[`handleVNCWebSocket_${this.proxyID}`];
        if (!handler) {
          throw new Error(`VNC WebSocket handler not available for proxy ${this.proxyID}`);
        }
        handler(this);
        this.readyState = VNCProxyWebSocket.OPEN;
        const event = new Event("open");
        this.onopen?.(event);
        this.dispatchEvent(event);
      } catch (error) {
        console.error("VNC WebSocket connection failed:", error);
        const errEvent = new Event("error");
        this.onerror?.(errEvent);
        this.dispatchEvent(errEvent);
        this.emitClose(1006, error instanceof Error ? error.message : "Connection failed");
      }
    }, 0);
  }

  // Called from Go side to pass data to noVNC.
  receiveFromGo(data: ArrayBuffer): void {
    const event = new MessageEvent("message", { data });
    this.onmessage?.(event);
    this.dispatchEvent(event);
  }

  send(data: ArrayBuffer | Uint8Array | string | Blob | ArrayBufferView): void {
    if (this.readyState !== VNCProxyWebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }

    let uint8Data: Uint8Array;
    if (data instanceof ArrayBuffer) {
      uint8Data = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      uint8Data = data;
    } else if (typeof data === "string") {
      uint8Data = new TextEncoder().encode(data);
    } else if ("buffer" in data && data.buffer instanceof ArrayBuffer) {
      const view = data as ArrayBufferView;
      uint8Data = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    } else {
      console.warn("VNCProxyWebSocket.send: unsupported data type", data);
      return;
    }

    if (this.onGoMessage) {
      this.onGoMessage(uint8Data);
    }
  }

  close(code = 1000, reason = ""): void {
    if (this.readyState === VNCProxyWebSocket.CLOSING || this.readyState === VNCProxyWebSocket.CLOSED) {
      return;
    }
    this.readyState = VNCProxyWebSocket.CLOSING;
    if (this.onGoClose) {
      this.onGoClose();
    }
    setTimeout(() => this.emitClose(code, reason), 0);
  }

  private emitClose(code = 1000, reason = ""): void {
    this.readyState = VNCProxyWebSocket.CLOSED;
    if (activeProxySockets.get(this.proxyID) === this) {
      activeProxySockets.delete(this.proxyID);
    }
    lastCloseInfo.set(this.proxyID, { code, reason });
    const event = new CloseEvent("close", { code, reason, wasClean: code === 1000 });
    this.onclose?.(event);
    this.dispatchEvent(event);
  }
}

// lastCloseInfo holds the most recent close code+reason per proxy ID so
// that callers wired into noVNC's disconnect event (which only carries
// {clean}) can recover the underlying transport-level reason.
const lastCloseInfo = new Map<string, { code: number; reason: string }>();

export function getLastVNCCloseInfo(
  proxyID: string,
): { code: number; reason: string } | undefined {
  return lastCloseInfo.get(proxyID);
}

export function clearLastVNCCloseInfo(proxyID: string): void {
  lastCloseInfo.delete(proxyID);
}

// activeProxySockets tracks the live VNCProxyWebSocket for each proxy ID
// so callers (e.g. the Paste button) can send NetBird-specific RFB
// messages out-of-band, without going through noVNC's protocol layer.
const activeProxySockets = new Map<string, VNCProxyWebSocket>();

export function sendRawToVNCProxy(proxyID: string, data: Uint8Array): boolean {
  const ws = activeProxySockets.get(proxyID);
  if (!ws || ws.readyState !== VNCProxyWebSocket.OPEN) return false;
  ws.send(data);
  return true;
}

/**
 * Patches the global WebSocket constructor to intercept VNC proxy URLs.
 * Must be called before noVNC creates its WebSocket connection.
 * Idempotent: calling more than once (e.g. on React remount) is a no-op,
 * otherwise every mount would stack another Proxy on top of window.WebSocket.
 */
const vncProxyInstalledMarker = Symbol.for("netbird.vnc.proxyInstalled");

export function installVNCWebSocketProxy(): void {
  const existing = window.WebSocket as typeof WebSocket & {
    [vncProxyInstalledMarker]?: boolean;
  };
  if (existing[vncProxyInstalledMarker]) {
    return;
  }
  const wrapped = new Proxy(existing, {
    construct(target, args) {
      // The WebSocket constructor accepts string | URL. Normalize both
      // before pattern-matching so a URL instance doesn't crash includes().
      const raw = args[0];
      const url = raw instanceof URL ? raw.toString() : typeof raw === "string" ? raw : "";

      if (url.includes("vnc.proxy.local")) {
        return new VNCProxyWebSocket(url) as unknown as WebSocket;
      }

      return new target(...(args as ConstructorParameters<typeof WebSocket>));
    },
  }) as typeof WebSocket & { [vncProxyInstalledMarker]?: boolean };
  wrapped[vncProxyInstalledMarker] = true;
  window.WebSocket = wrapped;
}
