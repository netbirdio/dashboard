/**
 * IronRDP Input Handler for NetBird WASM Client
 * Handles mouse and keyboard input for IronRDP sessions
 */
import type { IronRDPModule, RDPSession } from "./ironrdp-wasm-bridge";

interface DeviceEvent {
  free?(): void;
}
interface InputTransaction {
  addEvent(event: DeviceEvent): void;
  free?(): void;
}
interface IronRDPAPI extends IronRDPModule {
  DeviceEvent: {
    mouseButtonPressed(button: number): DeviceEvent;
    mouseButtonReleased(button: number): DeviceEvent;
    mouseMove(x: number, y: number): DeviceEvent;
    wheelRotations(isVertical: boolean, rotationUnits: number): DeviceEvent;
    keyPressed(scancode: number): DeviceEvent;
    keyReleased(scancode: number): DeviceEvent;
    unicode(code: number): DeviceEvent;
  };
  InputTransaction: new () => InputTransaction;
}
interface ExtendedRDPSession extends RDPSession {
  applyInputs(transaction: InputTransaction): void;
}
interface CoordinateResult {
  x: number;
  y: number;
}
declare global {
  interface Window {
    toggleFullscreen?: () => void;
  }
}
export class IronRDPInputHandler {
  private ironrdp: IronRDPAPI;
  private session: ExtendedRDPSession;
  private canvas: HTMLCanvasElement;
  private isActive = false;
  private mouseButtonStates: Record<number, boolean> = {
    0: false,
    1: false,
    2: false,
  };
  private keyStates = new Map<string, boolean>();
  private currentMouseX = 0;
  private currentMouseY = 0;

  // Bound event handlers for proper cleanup
  private boundHandlers = {
    mouseDown: this.handleMouseDown.bind(this),
    mouseUp: this.handleMouseUp.bind(this),
    mouseMove: this.handleMouseMove.bind(this),
    mouseEnter: this.handleMouseEnter.bind(this),
    wheel: this.handleWheel.bind(this),
    touchStart: this.handleTouchStart.bind(this),
    touchMove: this.handleTouchMove.bind(this),
    touchEnd: this.handleTouchEnd.bind(this),
    keyDown: this.handleKeyDown.bind(this),
    keyUp: this.handleKeyUp.bind(this),
    paste: this.handlePaste.bind(this),
    copy: this.handleCopy.bind(this),
    contextMenu: (e: Event) => e.preventDefault(),
    focus: this.handleFocus.bind(this),
    blur: this.handleBlur.bind(this),
    click: this.handleClick.bind(this),
    globalKeyDown: this.handleGlobalKeyDown.bind(this),
  };
  // Keyboard code to scancode mappings (using event.code instead of deprecated keyCode)
  private readonly codeToScancode: Record<string, number> = {
    // Letters
    KeyA: 0x1e,
    KeyB: 0x30,
    KeyC: 0x2e,
    KeyD: 0x20,
    KeyE: 0x12,
    KeyF: 0x21,
    KeyG: 0x22,
    KeyH: 0x23,
    KeyI: 0x17,
    KeyJ: 0x24,
    KeyK: 0x25,
    KeyL: 0x26,
    KeyM: 0x32,
    KeyN: 0x31,
    KeyO: 0x18,
    KeyP: 0x19,
    KeyQ: 0x10,
    KeyR: 0x13,
    KeyS: 0x1f,
    KeyT: 0x14,
    KeyU: 0x16,
    KeyV: 0x2f,
    KeyW: 0x11,
    KeyX: 0x2d,
    KeyY: 0x15,
    KeyZ: 0x2c,
    // Numbers
    Digit0: 0x0b,
    Digit1: 0x02,
    Digit2: 0x03,
    Digit3: 0x04,
    Digit4: 0x05,
    Digit5: 0x06,
    Digit6: 0x07,
    Digit7: 0x08,
    Digit8: 0x09,
    Digit9: 0x0a,
    // Function keys
    F1: 0x3b,
    F2: 0x3c,
    F3: 0x3d,
    F4: 0x3e,
    F5: 0x3f,
    F6: 0x40,
    F7: 0x41,
    F8: 0x42,
    F9: 0x43,
    F10: 0x44,
    F11: 0x57,
    F12: 0x58,
    // Special keys
    Backspace: 0x0e,
    Tab: 0x0f,
    Enter: 0x1c,
    ShiftLeft: 0x2a,
    ShiftRight: 0x36,
    ControlLeft: 0x1d,
    ControlRight: 0x9d,
    AltLeft: 0x38,
    AltRight: 0xb8,
    CapsLock: 0x3a,
    Escape: 0x01,
    Space: 0x39,
    PageUp: 0xe049,
    PageDown: 0xe051,
    End: 0xe04f,
    Home: 0xe047,
    ArrowLeft: 0xe04b,
    ArrowUp: 0xe048,
    ArrowRight: 0xe04d,
    ArrowDown: 0xe050,
    Insert: 0xe052,
    Delete: 0xe053,
    MetaLeft: this.isMacOS() ? 0x1d : 0x5b,
    MetaRight: this.isMacOS() ? 0x9d : 0x5c,
    // Punctuation
    Semicolon: 0x27,
    Equal: 0x0d,
    Comma: 0x33,
    Minus: 0x0c,
    Period: 0x34,
    Slash: 0x35,
    Backquote: 0x29,
    BracketLeft: 0x1a,
    Backslash: 0x2b,
    BracketRight: 0x1b,
    Quote: 0x28,
    // Numpad keys
    Numpad0: 0x52,
    Numpad1: 0x4f,
    Numpad2: 0x50,
    Numpad3: 0x51,
    Numpad4: 0x4b,
    Numpad5: 0x4c,
    Numpad6: 0x4d,
    Numpad7: 0x47,
    Numpad8: 0x48,
    Numpad9: 0x49,
    NumpadDecimal: 0x53,
    NumpadDivide: 0xe035,
    NumpadMultiply: 0x37,
    NumpadSubtract: 0x4a,
    NumpadAdd: 0x4e,
    NumpadEnter: 0xe01c,
    NumLock: 0x45,
    // System keys
    PrintScreen: 0xe037,
    ScrollLock: 0x46,
    Pause: 0xe11d,
    // Additional Windows/Context keys
    ContextMenu: 0xe05d,
    // Additional function keys (F13-F24)
    F13: 0x64,
    F14: 0x65,
    F15: 0x66,
    F16: 0x67,
    F17: 0x68,
    F18: 0x69,
    F19: 0x6a,
    F20: 0x6b,
    F21: 0x6c,
    F22: 0x6d,
    F23: 0x6e,
    F24: 0x76,
    // Media keys
    AudioVolumeDown: 0xe02e,
    AudioVolumeUp: 0xe030,
    AudioVolumeMute: 0xe020,
    MediaPlayPause: 0xe022,
    MediaStop: 0xe024,
    MediaTrackPrevious: 0xe010,
    MediaTrackNext: 0xe019,
    // Browser/Application keys
    BrowserBack: 0xe06a,
    BrowserForward: 0xe069,
    BrowserRefresh: 0xe067,
    BrowserStop: 0xe068,
    BrowserSearch: 0xe065,
    BrowserFavorites: 0xe066,
    BrowserHome: 0xe032,
    LaunchMail: 0xe06c,
    LaunchApp1: 0xe06b,
    LaunchApp2: 0xe021,
    // International keys
    IntlBackslash: 0x56,
    IntlRo: 0x73,
    IntlYen: 0x7d,
  };
  private readonly mouseButtonMap: Record<number, number> = {
    0: 0,
    1: 1,
    2: 2,
  };
  private touchState = {
    lastX: 0,
    lastY: 0,
    touching: false,
  };
  constructor(
    ironrdp: IronRDPModule,
    session: RDPSession,
    canvas: HTMLCanvasElement,
  ) {
    this.ironrdp = ironrdp as IronRDPAPI;
    this.session = session as ExtendedRDPSession;
    this.canvas = canvas;
    this.setupEventListeners();
    // Initialize mouse position to unknown - will be set on first mouse event
    this.currentMouseX = -1;
    this.currentMouseY = -1;
  }

  /**
   * Detect if the current platform is macOS
   */
  private isMacOS(): boolean {
    if ("userAgentData" in navigator && (navigator as any).userAgentData) {
      return (navigator as any).userAgentData.platform === "macOS";
    }
    // Fallback
    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  }
  /**
   * Calculate canvas coordinates with letterbox correction for fullscreen mode
   */
  private getCanvasCoordinates(
    clientX: number,
    clientY: number,
  ): CoordinateResult {
    const rect = this.canvas.getBoundingClientRect();
    // Calculate the actual rendered size of the canvas content
    const canvasAspectRatio = this.canvas.width / this.canvas.height;
    const containerAspectRatio = rect.width / rect.height;
    let renderWidth: number,
      renderHeight: number,
      offsetX: number,
      offsetY: number;
    // Check if we're using object-fit: contain (letterboxing)
    const isFullscreen =
      document.fullscreenElement === this.canvas ||
      document.fullscreenElement === this.canvas.parentElement;
    const hasLetterbox = isFullscreen && this.canvas.style.objectFit !== "fill";
    if (hasLetterbox && canvasAspectRatio !== containerAspectRatio) {
      // Calculate actual rendered dimensions with letterboxing
      if (canvasAspectRatio > containerAspectRatio) {
        // Canvas is wider - letterbox on top/bottom
        renderWidth = rect.width;
        renderHeight = rect.width / canvasAspectRatio;
        offsetX = 0;
        offsetY = (rect.height - renderHeight) / 2;
      } else {
        // Canvas is taller - letterbox on left/right
        renderWidth = rect.height * canvasAspectRatio;
        renderHeight = rect.height;
        offsetX = (rect.width - renderWidth) / 2;
        offsetY = 0;
      }
    } else {
      // No letterboxing - canvas fills the entire rect
      renderWidth = rect.width;
      renderHeight = rect.height;
      offsetX = 0;
      offsetY = 0;
    }
    // Calculate scale factors based on actual render size
    const scaleX = this.canvas.width / renderWidth;
    const scaleY = this.canvas.height / renderHeight;
    // Adjust coordinates for letterbox offset
    const relativeX = clientX - rect.left - offsetX;
    const relativeY = clientY - rect.top - offsetY;
    // Clamp to valid canvas area
    const x = Math.max(
      0,
      Math.min(this.canvas.width - 1, Math.round(relativeX * scaleX)),
    );
    const y = Math.max(
      0,
      Math.min(this.canvas.height - 1, Math.round(relativeY * scaleY)),
    );
    return { x, y };
  }
  private setupEventListeners(): void {
    this.canvas.tabIndex = 1;
    this.canvas.style.outline = "none";

    // Mouse events
    this.canvas.addEventListener("mousedown", this.boundHandlers.mouseDown);
    this.canvas.addEventListener("mouseup", this.boundHandlers.mouseUp);
    this.canvas.addEventListener("mousemove", this.boundHandlers.mouseMove);
    this.canvas.addEventListener("mouseenter", this.boundHandlers.mouseEnter);
    this.canvas.addEventListener("wheel", this.boundHandlers.wheel);
    this.canvas.addEventListener("contextmenu", this.boundHandlers.contextMenu);

    // Touch events
    this.canvas.addEventListener("touchstart", this.boundHandlers.touchStart);
    this.canvas.addEventListener("touchmove", this.boundHandlers.touchMove);
    this.canvas.addEventListener("touchend", this.boundHandlers.touchEnd);

    // Keyboard events
    this.canvas.addEventListener("keydown", this.boundHandlers.keyDown);
    this.canvas.addEventListener("keyup", this.boundHandlers.keyUp);
    this.canvas.addEventListener("paste", this.boundHandlers.paste);
    this.canvas.addEventListener("copy", this.boundHandlers.copy);

    // Focus events
    this.canvas.addEventListener("focus", this.boundHandlers.focus);
    this.canvas.addEventListener("blur", this.boundHandlers.blur);
    this.canvas.addEventListener("click", this.boundHandlers.click);

    // Global keyboard shortcuts
    document.addEventListener("keydown", this.boundHandlers.globalKeyDown);
  }
  private updateVisualIndicator(active: boolean): void {
    if (!this.canvas.parentElement) return;
    const controls = this.canvas.parentElement.querySelector(
      "#rdpControls",
    ) as HTMLElement;
    if (!controls) return;
    controls.style.borderBottom = active ? "2px solid #4CAF50" : "none";
  }
  private handleGlobalKeyDown(e: KeyboardEvent): void {
    if (!this.isActive) return;
    // F11 for fullscreen toggle
    if (e.key === "F11") {
      e.preventDefault();
      if (window.toggleFullscreen) {
        window.toggleFullscreen();
      }
    }
    // Ctrl+Alt+Enter for fullscreen toggle
    else if (e.ctrlKey && e.altKey && e.key === "Enter") {
      e.preventDefault();
      if (window.toggleFullscreen) {
        window.toggleFullscreen();
      }
    }
  }

  private handleFocus(): void {
    this.isActive = true;
    this.updateVisualIndicator(true);
    // Trigger clipboard sync when canvas gains focus
    this.requestClipboardSync();
  }

  private handleBlur(): void {
    this.isActive = false;
    this.releaseAllKeys();
    this.updateVisualIndicator(false);
  }

  private handleClick(): void {
    this.canvas.focus();
    // Also sync clipboard on click to ensure paste works
    this.requestClipboardSync();
  }

  private handlePaste(event: ClipboardEvent): void {
    if (!this.isActive) return;

    // Only prevent default if we successfully handle the paste
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const text = clipboardData.getData("text/plain");
    if (!text) return;

    // Prevent the default paste behavior only after we have the text
    event.preventDefault();

    // Send Ctrl+V combination to RDP session first to maintain consistency
    this.sendPasteKeyCombination();

    // Then send the actual text content
    this.sendTextAsKeystrokes(text);
  }

  private handleCopy(event: ClipboardEvent): void {
    if (!this.isActive) return;

    // Send Ctrl+C combination to RDP session
    this.sendCopyKeyCombination();

    // Let the browser handle the actual copy operation
    // Don't prevent default - we want the browser to copy from the RDP canvas
  }

  private sendPasteKeyCombination(): void {
    if (!this.session || !this.ironrdp) return;

    try {
      const transaction = new this.ironrdp.InputTransaction();

      // Send Ctrl (or Cmd on Mac) key down
      const ctrlScancode = this.isMacOS()
        ? this.codeToScancode.MetaLeft
        : this.codeToScancode.ControlLeft;
      const vScancode = this.codeToScancode.KeyV;

      if (ctrlScancode && vScancode) {
        // Ctrl/Cmd down
        const ctrlDown = this.ironrdp.DeviceEvent.keyPressed(ctrlScancode);
        transaction.addEvent(ctrlDown);

        // V down
        const vDown = this.ironrdp.DeviceEvent.keyPressed(vScancode);
        transaction.addEvent(vDown);

        // V up
        const vUp = this.ironrdp.DeviceEvent.keyReleased(vScancode);
        transaction.addEvent(vUp);

        // Ctrl/Cmd up
        const ctrlUp = this.ironrdp.DeviceEvent.keyReleased(ctrlScancode);
        transaction.addEvent(ctrlUp);

        this.session.applyInputs(transaction);
      }
    } catch (err) {
      console.error("Error sending paste key combination:", err);
    }
  }

  private sendCopyKeyCombination(): void {
    if (!this.session || !this.ironrdp) return;

    try {
      const transaction = new this.ironrdp.InputTransaction();

      // Send Ctrl (or Cmd on Mac) key down
      const ctrlScancode = this.isMacOS()
        ? this.codeToScancode.MetaLeft
        : this.codeToScancode.ControlLeft;
      const cScancode = this.codeToScancode.KeyC;

      if (ctrlScancode && cScancode) {
        // Ctrl/Cmd down
        const ctrlDown = this.ironrdp.DeviceEvent.keyPressed(ctrlScancode);
        transaction.addEvent(ctrlDown);

        // C down
        const cDown = this.ironrdp.DeviceEvent.keyPressed(cScancode);
        transaction.addEvent(cDown);

        // C up
        const cUp = this.ironrdp.DeviceEvent.keyReleased(cScancode);
        transaction.addEvent(cUp);

        // Ctrl/Cmd up
        const ctrlUp = this.ironrdp.DeviceEvent.keyReleased(ctrlScancode);
        transaction.addEvent(ctrlUp);

        this.session.applyInputs(transaction);
      }
    } catch (err) {
      console.error("Error sending copy key combination:", err);
    }
  }

  private sendTextAsKeystrokes(text: string): void {
    if (!this.session || !this.ironrdp) return;

    try {
      const transaction = new this.ironrdp.InputTransaction();

      // Send each character as unicode event
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const deviceEvent = this.ironrdp.DeviceEvent.unicode(charCode);
        transaction.addEvent(deviceEvent);
      }

      this.session.applyInputs(transaction);
    } catch (err) {
      console.error("Error sending paste text:", err);
    }
  }

  private requestClipboardSync(): void {
    // Notify the WASM bridge to check and sync clipboard, only for chrome for now, firefox and safari have issues with this
    if (!/Chrome/.test(navigator.userAgent)) {
      return;
    }

    if (
      window.IronRDPBridge &&
      (window.IronRDPBridge as any).checkAndSendClipboard
    ) {
      setTimeout(() => {
        (window.IronRDPBridge as any).checkAndSendClipboard();
      }, 50);
    }
  }
  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.canvas.focus();
    if (!this.isActive) {
      this.isActive = true;
    }

    const { x, y } = this.getCanvasCoordinates(event.clientX, event.clientY);
    const button = this.mouseButtonMap[event.button];
    if (button === undefined) return;
    if (this.mouseButtonStates[event.button]) return;
    this.mouseButtonStates[event.button] = true;

    try {
      if (!this.session || !this.ironrdp) return;
      const transaction = new this.ironrdp.InputTransaction();

      // Always send mouse position first, then the button press
      const moveEvent = this.ironrdp.DeviceEvent.mouseMove(x, y);
      const clickEvent = this.ironrdp.DeviceEvent.mouseButtonPressed(button);

      transaction.addEvent(moveEvent);
      transaction.addEvent(clickEvent);
      this.session.applyInputs(transaction);

      this.currentMouseX = x;
      this.currentMouseY = y;
    } catch (err) {
      console.error("Error sending mouse down:", err);
    }
  }
  private handleMouseUp(event: MouseEvent): void {
    event.preventDefault();
    const button = this.mouseButtonMap[event.button];
    if (button === undefined) return;
    if (!this.mouseButtonStates[event.button]) return;
    this.mouseButtonStates[event.button] = false;
    try {
      if (!this.session || !this.ironrdp) return;
      const deviceEvent = this.ironrdp.DeviceEvent.mouseButtonReleased(button);
      const transaction = new this.ironrdp.InputTransaction();
      transaction.addEvent(deviceEvent);
      this.session.applyInputs(transaction);
    } catch (err) {
      console.error("Error sending mouse up:", err);
    }
  }
  private handleMouseEnter(event: MouseEvent): void {
    // Always sync position when entering
    this.handleMouseMove(event);
  }

  private handleMouseMove(event: MouseEvent): void {
    const { x, y } = this.getCanvasCoordinates(event.clientX, event.clientY);

    // Skip if position hasn't changed
    if (x === this.currentMouseX && y === this.currentMouseY) {
      return;
    }

    this.currentMouseX = x;
    this.currentMouseY = y;

    try {
      if (!this.session || !this.ironrdp) return;
      const deviceEvent = this.ironrdp.DeviceEvent.mouseMove(x, y);
      const transaction = new this.ironrdp.InputTransaction();
      transaction.addEvent(deviceEvent);
      this.session.applyInputs(transaction);
    } catch (err) {
      console.error("Error sending mouse move:", err);
    }
  }
  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    if (!this.isActive) return;
    // Calculate rotation units (120 units = 1 notch)
    const delta = event.deltaY > 0 ? -1 : 1;
    const rotationUnits = delta * 120;
    try {
      if (!this.session || !this.ironrdp) return;
      const deviceEvent = this.ironrdp.DeviceEvent.wheelRotations(
        true,
        rotationUnits,
      );
      const transaction = new this.ironrdp.InputTransaction();
      transaction.addEvent(deviceEvent);
      this.session.applyInputs(transaction);
    } catch (err) {
      console.error("Error sending wheel event:", err);
    }
  }
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return;

    // For clipboard operations, don't prevent default to allow clipboard events to fire
    const isClipboardPaste =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v";
    const isClipboardCopy =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";

    if (!isClipboardPaste && !isClipboardCopy) {
      event.preventDefault();
    }

    // Don't send clipboard combinations here - let the clipboard events handle them (only for Chromium browsers)
    const isChromium = /Chrome/.test(navigator.userAgent);
    if ((isClipboardPaste || isClipboardCopy) && isChromium) {
      return;
    }

    const scancode = this.codeToScancode[event.code];
    if (scancode !== undefined) {
      try {
        if (!this.session || !this.ironrdp) return;
        const deviceEvent = this.ironrdp.DeviceEvent.keyPressed(scancode);
        const transaction = new this.ironrdp.InputTransaction();
        transaction.addEvent(deviceEvent);
        this.session.applyInputs(transaction);
      } catch (err) {
        console.error("Error sending key down:", err);
      }
    } else if (event.key.length === 1) {
      // For printable characters not in our scancode map, use unicode
      try {
        if (!this.session || !this.ironrdp) return;
        const charCode = event.key.charCodeAt(0);
        const deviceEvent = this.ironrdp.DeviceEvent.unicode(charCode);
        const transaction = new this.ironrdp.InputTransaction();
        transaction.addEvent(deviceEvent);
        this.session.applyInputs(transaction);
      } catch (err) {
        console.error("Error sending unicode char:", err);
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.isActive) return;

    // For clipboard operations, don't prevent default to allow clipboard events to fire
    const isClipboardPaste =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v";
    const isClipboardCopy =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";

    if (!isClipboardPaste && !isClipboardCopy) {
      event.preventDefault();
    }

    // Don't send clipboard combinations here - let the clipboard events handle them
    const isChromium = /Chrome/.test(navigator.userAgent);
    if ((isClipboardPaste || isClipboardCopy) && isChromium) {
      return;
    }

    const scancode = this.codeToScancode[event.code];
    if (scancode === undefined) return;
    try {
      if (!this.session || !this.ironrdp) return;
      const deviceEvent = this.ironrdp.DeviceEvent.keyReleased(scancode);
      const transaction = new this.ironrdp.InputTransaction();
      transaction.addEvent(deviceEvent);
      this.session.applyInputs(transaction);
    } catch (err) {
      console.error("Error sending key up:", err);
    }
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    const { x, y } = this.getCanvasCoordinates(touch.clientX, touch.clientY);
    this.touchState.lastX = x;
    this.touchState.lastY = y;
    this.touchState.touching = true;
    // Simulate mouse down
    try {
      if (!this.session || !this.ironrdp) return;
      const moveEvent = this.ironrdp.DeviceEvent.mouseMove(x, y);
      const clickEvent = this.ironrdp.DeviceEvent.mouseButtonPressed(0);
      const transaction = new this.ironrdp.InputTransaction();
      transaction.addEvent(moveEvent);
      transaction.addEvent(clickEvent);
      this.session.applyInputs(transaction);

      this.currentMouseX = x;
      this.currentMouseY = y;
    } catch (err) {
      console.error("Error handling touch start:", err);
    }
  }
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.touchState.touching || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const { x, y } = this.getCanvasCoordinates(touch.clientX, touch.clientY);
    if (x === this.touchState.lastX && y === this.touchState.lastY) return;
    this.touchState.lastX = x;
    this.touchState.lastY = y;
    try {
      if (!this.session || !this.ironrdp) return;
      const deviceEvent = this.ironrdp.DeviceEvent.mouseMove(x, y);
      const transaction = new this.ironrdp.InputTransaction();
      transaction.addEvent(deviceEvent);
      this.session.applyInputs(transaction);

      this.currentMouseX = x;
      this.currentMouseY = y;
    } catch (err) {
      console.error("Error handling touch move:", err);
    }
  }
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    if (!this.touchState.touching) return;
    this.touchState.touching = false;
    // Simulate mouse up
    try {
      if (!this.session || !this.ironrdp) return;
      const deviceEvent = this.ironrdp.DeviceEvent.mouseButtonReleased(0);
      const transaction = new this.ironrdp.InputTransaction();
      transaction.addEvent(deviceEvent);
      this.session.applyInputs(transaction);
    } catch (err) {
      console.error("Error handling touch end:", err);
    }
  }
  private releaseAllKeys(): void {
    this.keyStates.forEach((pressed, code) => {
      if (!pressed) return;
      const scancode = this.codeToScancode[code];
      if (scancode === undefined) return;
      try {
        if (!this.session || !this.ironrdp) return;
        const deviceEvent = this.ironrdp.DeviceEvent.keyReleased(scancode);
        const transaction = new this.ironrdp.InputTransaction();
        transaction.addEvent(deviceEvent);
        this.session.applyInputs(transaction);
      } catch (err) {
        console.error("Error releasing key:", err);
      }
    });
    this.keyStates.clear();
  }
  destroy(): void {
    // Remove all event listeners using the same bound functions
    this.canvas.removeEventListener("mousedown", this.boundHandlers.mouseDown);
    this.canvas.removeEventListener("mouseup", this.boundHandlers.mouseUp);
    this.canvas.removeEventListener("mousemove", this.boundHandlers.mouseMove);
    this.canvas.removeEventListener(
      "mouseenter",
      this.boundHandlers.mouseEnter,
    );
    this.canvas.removeEventListener("wheel", this.boundHandlers.wheel);
    this.canvas.removeEventListener(
      "contextmenu",
      this.boundHandlers.contextMenu,
    );
    this.canvas.removeEventListener(
      "touchstart",
      this.boundHandlers.touchStart,
    );
    this.canvas.removeEventListener("touchmove", this.boundHandlers.touchMove);
    this.canvas.removeEventListener("touchend", this.boundHandlers.touchEnd);
    this.canvas.removeEventListener("keydown", this.boundHandlers.keyDown);
    this.canvas.removeEventListener("keyup", this.boundHandlers.keyUp);
    this.canvas.removeEventListener("paste", this.boundHandlers.paste);
    this.canvas.removeEventListener("copy", this.boundHandlers.copy);
    this.canvas.removeEventListener("focus", this.boundHandlers.focus);
    this.canvas.removeEventListener("blur", this.boundHandlers.blur);
    this.canvas.removeEventListener("click", this.boundHandlers.click);
    document.removeEventListener("keydown", this.boundHandlers.globalKeyDown);

    this.releaseAllKeys();
    this.isActive = false;
  }
}
if (typeof window !== "undefined") {
  (window as any).IronRDPInputHandler = IronRDPInputHandler;
}
