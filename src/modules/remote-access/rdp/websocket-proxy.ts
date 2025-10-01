/**
 * WebSocket Proxy System for RDCleanPath connections
 * Provides WebSocket interface that routes through RDCleanPath proxy
 */

import type { CertificateHandler, CertificateInfo, RDCleanPathResponse } from './rdp-certificate-handler';

declare global {
  interface Window {
    handleRDCleanPathWebSocket?: (ws: RDCleanPathProxyWebSocket, proxyID: string) => void;
    createRDCleanPathProxy?: (hostname: string, port: number) => Promise<string>;
    getRDCleanPathCertificate?: (proxyID: string) => Promise<RDCleanPathResponse | null>;
    RDCleanPathProxyWebSocket?: typeof RDCleanPathProxyWebSocket;
    sendToRDCleanPathProxy?: (proxyID: string, data: ArrayBuffer | Uint8Array | string) => void;
    closeRDCleanPathProxy?: (proxyID: string) => void;
  }
}

abstract class BaseWebSocketProxy extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  url: string;
  readyState: number;
  readonly protocol: string = '';
  readonly extensions: string = '';
  readonly bufferedAmount: number = 0;
  readonly binaryType: BinaryType = 'blob';

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  protected messageQueue: any[] = [];

  constructor(url: string) {
    super();
    this.url = url;
    this.readyState = BaseWebSocketProxy.CONNECTING;
  }

  get CONNECTING() { return BaseWebSocketProxy.CONNECTING; }
  get OPEN() { return BaseWebSocketProxy.OPEN; }
  get CLOSING() { return BaseWebSocketProxy.CLOSING; }
  get CLOSED() { return BaseWebSocketProxy.CLOSED; }

  protected emitOpen(): void {
    this.readyState = BaseWebSocketProxy.OPEN;
    const event = new Event('open');
    this.onopen?.(event);
    this.dispatchEvent(event);
  }

  protected emitError(error: any): void {
    const event = new Event('error');
    this.onerror?.(event);
    this.dispatchEvent(event);
  }

  protected emitMessage(data: any): void {
    const event = new MessageEvent('message', { data });
    this.onmessage?.(event);
    this.dispatchEvent(event);
  }

  protected emitClose(code = 1000, reason = ''): void {
    this.readyState = BaseWebSocketProxy.CLOSED;
    const event = new CloseEvent('close', { code, reason, wasClean: code === 1000 });
    this.onclose?.(event);
    this.dispatchEvent(event);
  }

  abstract send(data: ArrayBuffer | Uint8Array | string | Blob | ArrayBufferView): void;
  abstract close(code?: number, reason?: string): void;
}

export class RDCleanPathProxyWebSocket extends BaseWebSocketProxy {
  private proxyID: string;
  private certificateHandler: CertificateHandler | null;
  onGoMessage?: (data: Uint8Array) => void;
  onGoClose?: () => void;
  onCertificateRequest?: (certData: RDCleanPathResponse) => Promise<boolean>;

  constructor(url: string) {
    super(url);
    const match = url.match(/rdcleanpath\.proxy\.local\/(.+)/);
    this.proxyID = match?.[1] || 'default';

    if (window.RDPCertificateHandler) {
      this.certificateHandler = new window.RDPCertificateHandler();
    } else {
      this.certificateHandler = null;
    }
    this.onCertificateRequest = async (certData) => {
      return this.validateCertificate(certData);
    };
    void this._connect();
  }

  private async _connect(): Promise<void> {
    try {
      const handler = (window as any)[`handleRDCleanPathWebSocket_${this.proxyID}`];
      if (!handler) {
        throw new Error(`RDCleanPath WebSocket handler not available for proxy ${this.proxyID}`);
      }
      handler(this);
      this.emitOpen();
    } catch (error) {
      console.error('RDCleanPath WebSocket connection failed:', error);
      this.emitError(error);
      this.emitClose(1006, error instanceof Error ? error.message : 'Connection failed');
    }
  }

  protected _sendInternal(data: Uint8Array): void {
    if (this.onGoMessage) {
      this.onGoMessage(data);
    } else {
      console.warn('onGoMessage not set for proxy', this.proxyID);
    }
  }

  send(data: ArrayBuffer | Uint8Array | string | Blob | ArrayBufferView): void {
    if (this.readyState === BaseWebSocketProxy.CONNECTING) {
      this.messageQueue.push(data);
      return;
    }
    if (this.readyState !== BaseWebSocketProxy.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Convert all data types to Uint8Array
    if (data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = () => {
        this._sendInternal(new Uint8Array(reader.result as ArrayBuffer));
      };
      reader.readAsArrayBuffer(data);
    } else if (typeof data === 'string') {
      const encoder = new TextEncoder();
      this._sendInternal(encoder.encode(data));
    } else if (data instanceof ArrayBuffer) {
      this._sendInternal(new Uint8Array(data));
    } else if ('buffer' in data && data.buffer instanceof ArrayBuffer) {
      const view = data as ArrayBufferView;
      this._sendInternal(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    } else {
      this._sendInternal(data as Uint8Array);
    }
  }

  private async validateCertificate(certData: RDCleanPathResponse): Promise<boolean> {
    if (!this.certificateHandler) {
      return false;
    }
    try {
      return await this.certificateHandler.handleRDCleanPathResponse(certData);
    } catch (error) {
      console.error('Certificate validation error:', error);
      return false;
    }
  }

  // Called from Go side to pass data to JavaScript
  receiveFromGo(data: ArrayBuffer): void {
    this.emitMessage(data);
  }

  // Called from Go side to close the connection
  closeFromGo(code?: number, reason?: string): void {
    this.emitClose(code, reason);
  }

  close(code = 1000, reason = ''): void {
    if (this.readyState === BaseWebSocketProxy.CLOSING || this.readyState === BaseWebSocketProxy.CLOSED) {
      return;
    }
    this.readyState = BaseWebSocketProxy.CLOSING;
    if (this.onGoClose) {
      this.onGoClose();
    } else if (window.closeRDCleanPathProxy) {
      window.closeRDCleanPathProxy(this.proxyID);
    }
    setTimeout(() => {
      this.emitClose(code, reason);
    }, 0);
  }
}

export function installWebSocketProxy(): void {
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = new Proxy(OriginalWebSocket, {
    construct(_target, args) {
      const url = args[0] as string;

      if (url?.includes('rdcleanpath.proxy.local')) {
        window.RDCleanPathProxyWebSocket = RDCleanPathProxyWebSocket;
        return new RDCleanPathProxyWebSocket(url) as unknown as WebSocket;
      }

      return new OriginalWebSocket(url, args[1]);
    }
  }) as typeof WebSocket;
}