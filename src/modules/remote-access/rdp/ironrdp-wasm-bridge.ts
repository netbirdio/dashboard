export interface IronRDPModule {
  SessionBuilder: new () => SessionBuilder;
  DesktopSize: new (width: number, height: number) => DesktopSize;
  ClipboardData?: new () => ClipboardData;
  default?: () => Promise<void>;
  init?: () => Promise<void>;
}
interface DesktopSize {
  width: number;
  height: number;
}
interface SessionBuilder {
  username(user: string): SessionBuilder;
  password(pwd: string): SessionBuilder;
  destination(dest: string): SessionBuilder;
  serverDomain(domain: string): SessionBuilder;
  desktopSize(size: DesktopSize): SessionBuilder;
  renderCanvas(canvas: HTMLCanvasElement): SessionBuilder;
  proxyAddress(url: string): SessionBuilder;
  authToken(token: string): SessionBuilder;
  setCursorStyleCallback(cb: (style: string) => void): void;
  setCursorStyleCallbackContext(ctx: unknown): void;
  remoteClipboardChangedCallback(cb: (data: ClipboardData) => void): void;
  forceClipboardUpdateCallback(cb: () => void): void;
  connect(): Promise<RDPSession>;
}
export interface RDPSession {
  run(): Promise<TerminationInfo>;
  shutdown(): void;
  sendInput(input: unknown): void;
  onClipboardPaste?(content: ClipboardData): Promise<void>;
  inputHandler?: IronRDPInputHandler;
}
interface TerminationInfo {
  reason(): string;
}
interface ClipboardData {
  items(): ClipboardItem[];
  addText(mimeType: string, text: string): void;
  addBinary(mimeType: string, binary: Uint8Array): void;
  isEmpty(): boolean;
}
interface ClipboardItem {
  mimeType(): string;
  value(): string;
}
interface RDPConfig {
  username: string;
  password: string;
  domain?: string;
  width: number;
  height: number;
  enable_tls: boolean;
  enable_credssp: boolean;
  enable_nla: boolean;
}
declare global {
  interface Window {
    IronRDPBridge: IronRDPWASMBridge;
    IronRDPInputHandler?: new (
      ironrdp: IronRDPModule,
      session: RDPSession,
      canvas: HTMLCanvasElement,
    ) => IronRDPInputHandler;
    initializeIronRDP: () => Promise<boolean>;
    onIronRDPReady?: () => void;
    createRDCleanPathProxy?: (
      hostname: string,
      port: number,
    ) => Promise<string>;
  }
}
interface IronRDPInputHandler {
  destroy(): void;
}

const IRON_RDP_PKG = "/ironrdp-pkg/ironrdp_web.js";

export class IronRDPWASMBridge {
  private ironrdp: IronRDPModule | null = null;
  private initialized = false;
  private sessions = new Map<string, RDPSession>();
  private lastClipboardContent = "";
  private clipboardEventListeners: (() => void)[] = [];

  // Expose clipboard sync method for input handler
  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      // @ts-ignore - Dynamic import from public directory
      const ironrdpModule = (await import(
        /* webpackIgnore: true */ IRON_RDP_PKG
      )) as IronRDPModule;
      try {
        if (ironrdpModule.default) {
          await ironrdpModule.default();
        }
      } catch (e) {
        if (ironrdpModule.init) {
          await ironrdpModule.init();
        }
      }
      this.ironrdp = ironrdpModule;
      this.initialized = true;
      if (window.onIronRDPReady) {
        window.onIronRDPReady();
      }
    } catch (error) {
      console.error("Failed to load IronRDP WASM:", error);
      this.initialized = false;
    }
  }
  async connect(
    hostname: string,
    port: number,
    username: string,
    password: string,
    canvas: HTMLCanvasElement,
    enableClipboard = true,
    netbirdClient?: {
      createRDPProxy: (hostname: string, port: string) => Promise<string>;
    },
  ): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.ironrdp) {
      throw new Error("IronRDP module not loaded");
    }
    const sessionId = `${hostname}:${port}_${Date.now()}`;
    try {
      const config: RDPConfig = {
        username,
        password,
        domain: "",
        width: canvas.width || 1024,
        height: canvas.height || 768,
        enable_tls: true,
        enable_credssp: true,
        enable_nla: true,
      };
      const builder = new this.ironrdp.SessionBuilder();
      builder
        .username(username)
        .password(password)
        .destination(`${hostname}:${port}`);
      if (config.domain) {
        builder.serverDomain(config.domain);
      }
      const desktopSize = new this.ironrdp.DesktopSize(
        config.width,
        config.height,
      );
      builder.desktopSize(desktopSize);
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
        }
        builder.renderCanvas(canvas);
      }
      builder.setCursorStyleCallback((style: string) => {});
      builder.setCursorStyleCallbackContext(null);
      if (enableClipboard) {
        this.setupClipboard(builder);
      }
      // RDCleanPath proxy is required for IronRDP
      if (!netbirdClient || !netbirdClient.createRDPProxy) {
        throw new Error("NetBird client with RDP proxy support is required");
      }
      const proxyURL = await netbirdClient.createRDPProxy(
        hostname,
        port.toString(),
      );
      builder.proxyAddress(proxyURL);
      builder.authToken("");
      const session = await builder.connect();
      this.sessions.set(sessionId, session);
      if (canvas) {
        this.attachInputHandler(session, canvas);
      }
      if (enableClipboard) {
        this.startClipboardEventListeners();
      }
      this.startSession(session, sessionId);
      return sessionId;
    } catch (error) {
      console.error(`IronRDP connection failed:`, error);
      this.logIronError(error);
      throw error;
    }
  }
  private setupClipboard(builder: SessionBuilder): void {
    if (!this.ironrdp?.ClipboardData) {
      console.warn("ClipboardData class not available in IronRDP module");
      return;
    }
    builder.remoteClipboardChangedCallback((clipboardData: ClipboardData) => {
      this.handleRemoteClipboard(clipboardData);
    });
    builder.forceClipboardUpdateCallback(() => {
      this.handleLocalClipboardRequest();
    });
  }
  private attachInputHandler(
    session: RDPSession,
    canvas: HTMLCanvasElement,
  ): void {
    if (!window.IronRDPInputHandler) {
      console.warn("IronRDPInputHandler not loaded - input will not work");
      return;
    }
    if (!this.ironrdp) {
      console.warn("IronRDP module not available");
      return;
    }
    session.inputHandler = new window.IronRDPInputHandler(
      this.ironrdp,
      session,
      canvas,
    );
  }
  private startSession(session: RDPSession, sessionId: string): void {
    session
      .run()
      .then((termInfo) => {
        this.cleanupSession(session, sessionId);
      })
      .catch((err) => {
        console.error("IronRDP session error:", err);
        this.cleanupSession(session, sessionId);
        throw Error(err);
      });
  }
  private cleanupSession(session: RDPSession, sessionId: string): void {
    if (session.inputHandler) {
      session.inputHandler.destroy();
    }
    this.sessions.delete(sessionId);

    // Stop clipboard event listeners if no active sessions
    if (this.sessions.size === 0) {
      this.stopClipboardEventListeners();
    }
  }
  private logIronError(error: unknown): void {
    const ironError = error as any;
    if (!ironError || !ironError.__wbg_ptr) return;
    try {
      if (ironError.backtrace) {
        console.error("IronRDP backtrace:", ironError.backtrace());
      }
      if (ironError.kind) {
        const errorKind = ironError.kind();
        const errorKindNames = [
          "General",
          "WrongPassword",
          "LogonFailure",
          "AccessDenied",
          "RDCleanPath",
          "ProxyConnect",
          "NegotiationFailure",
        ];
        const errorKindName = errorKindNames[errorKind] || "Unknown";
        console.error("IronRDP error kind:", errorKindName, `(${errorKind})`);
      }
    } catch (e) {
      console.error("Could not extract IronError details:", e);
    }
  }
  disconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (session.inputHandler) {
      session.inputHandler.destroy();
      session.inputHandler = undefined;
    }
    if (session.shutdown) {
      session.shutdown();
    }
    this.sessions.delete(sessionId);

    // Stop clipboard event listeners if no active sessions
    if (this.sessions.size === 0) {
      this.stopClipboardEventListeners();
    }
  }
  private handleRemoteClipboard(clipboardData: ClipboardData): void {
    if (!navigator.clipboard?.writeText) {
      console.warn("Browser clipboard API not available");
      return;
    }
    if (!clipboardData.items) {
      console.error("clipboardData.items() method not found");
      return;
    }
    const items = clipboardData.items();
    if (items.length === 0) return;
    for (const item of items) {
      const mimeType = item.mimeType();
      const value = item.value();
      if (mimeType !== "text/plain") {
        continue;
      }
      navigator.clipboard
        .writeText(value)
        .then(() => {
          //this.showClipboardNotification("Clipboard updated from RDP");
        })
        .catch((err) => {
          console.error("Failed to copy to browser clipboard:", err);
          this.fallbackClipboardCopy(value);
        });
      return; // Only handle first text item
    }
  }
  private fallbackClipboardCopy(text: string): void {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) {
        //this.showClipboardNotification("Clipboard updated from RDP");
      }
    } catch (err) {
      console.error("Fallback clipboard error:", err);
    }
  }

  private async handleLocalClipboardRequest(): Promise<void> {
    if (!navigator.clipboard?.readText) {
      console.warn("Browser clipboard read API not available");
      return;
    }
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && clipboardText !== this.lastClipboardContent) {
        await this.sendClipboardToRDP(clipboardText);
        this.lastClipboardContent = clipboardText;
      }
    } catch (err) {
      console.warn("Could not read from clipboard:", err);
    }
  }

  private async sendClipboardToRDP(text: string): Promise<void> {
    if (!this.ironrdp?.ClipboardData) return;

    for (const [sessionId, session] of this.sessions) {
      try {
        const clipboardData = new this.ironrdp.ClipboardData();
        clipboardData.addText("text/plain", text);

        if (session.onClipboardPaste) {
          await session.onClipboardPaste(clipboardData);
        }
        //this.showClipboardNotification("Clipboard sent to RDP");
      } catch (err) {
        console.error("Failed to send clipboard to RDP:", err);
      }
    }
  }
  private startClipboardEventListeners(): void {
    if (this.clipboardEventListeners.length > 0) return;

    // Listen for keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+X)
    const handleKeyboardShortcut = async (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        ["c", "x", "v"].includes(event.key.toLowerCase())
      ) {
        // For copy/cut operations, check clipboard after delay
        if (["c", "x"].includes(event.key.toLowerCase())) {
          setTimeout(async () => {
            await this.checkAndSendClipboard();
          }, 100);
        }
        // For paste, check immediately to ensure up-to-date content
        else if (event.key.toLowerCase() === "v") {
          await this.checkAndSendClipboard();
        }
      }
    };

    // Listen for clipboard events (more reliable when available)
    const handleClipboardChange = async () => {
      await this.checkAndSendClipboard();
    };

    // Listen for focus events - check clipboard when window regains focus
    const handleFocus = async () => {
      await this.checkAndSendClipboard();
    };

    // Add event listeners
    document.addEventListener("keydown", handleKeyboardShortcut);
    document.addEventListener("copy", handleClipboardChange);
    document.addEventListener("cut", handleClipboardChange);
    window.addEventListener("focus", handleFocus);

    // Store cleanup functions
    this.clipboardEventListeners = [
      () => document.removeEventListener("keydown", handleKeyboardShortcut),
      () => document.removeEventListener("copy", handleClipboardChange),
      () => document.removeEventListener("cut", handleClipboardChange),
      () => window.removeEventListener("focus", handleFocus),
    ];
  }

  private stopClipboardEventListeners(): void {
    this.clipboardEventListeners.forEach((cleanup) => cleanup());
    this.clipboardEventListeners = [];
  }

  public async checkAndSendClipboard(): Promise<void> {
    if (!navigator.clipboard?.readText) return;

    if (!/Chrome/.test(navigator.userAgent)) {
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && clipboardText !== this.lastClipboardContent) {
        await this.sendClipboardToRDP(clipboardText);
        this.lastClipboardContent = clipboardText;
      }
    } catch (err) {
      // Ignore clipboard read errors - might be due to focus/permission issues
    }
  }
}
if (typeof window !== "undefined") {
  window.IronRDPBridge = new IronRDPWASMBridge();
  window.initializeIronRDP = async function (): Promise<boolean> {
    try {
      await window.IronRDPBridge.initialize();
      return true;
    } catch (error) {
      console.error("Failed to initialize IronRDP:", error);
      return false;
    }
  };
}
