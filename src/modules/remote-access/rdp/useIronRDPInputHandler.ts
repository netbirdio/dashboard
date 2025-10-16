import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    unicodePressed(unicode: string): DeviceEvent;
    unicodeReleased(unicode: string): DeviceEvent;
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

interface UseIronRDPInputHandlerProps {
  ironrdp: IronRDPModule | null;
  session: RDPSession | null;
  canvas: HTMLCanvasElement | null;
  isConnected: boolean;
}

declare global {
  interface Window {
    toggleFullscreen?: () => void;
  }
}

const activeHandlers = new Map<HTMLCanvasElement, () => void>();

export const useIronRDPInputHandler = ({
  ironrdp,
  session,
  canvas,
  isConnected,
}: UseIronRDPInputHandlerProps) => {
  const [isActive, setIsActive] = useState(false);
  const mouseButtonStatesRef = useRef<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
  });
  const keyStatesRef = useRef(new Map<string, boolean>());
  const currentMouseRef = useRef({ x: 0, y: 0 });
  const touchStateRef = useRef({
    lastX: 0,
    lastY: 0,
    touching: false,
    touchId: null as number | null,
  });

  const codeToScancode: Record<string, number> = useMemo(
    () => ({
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
      MetaLeft: isMacOS() ? 0x1d : 0x5b,
      MetaRight: isMacOS() ? 0x9d : 0x5c,
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
    }),
    [],
  );

  const mouseButtonMap: Record<number, number> = useMemo(() => {
    return { 0: 0, 1: 1, 2: 2 };
  }, []);

  /**
   * Detect macOS
   */
  function isMacOS(): boolean {
    if ("userAgentData" in navigator && (navigator as any).userAgentData) {
      return (navigator as any).userAgentData.platform === "macOS";
    }
    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  }

  const getCanvasCoordinates = useCallback(
    (clientX: number, clientY: number): CoordinateResult => {
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const canvasAspectRatio = canvas.width / canvas.height;
      const containerAspectRatio = rect.width / rect.height;

      let renderWidth: number,
        renderHeight: number,
        offsetX: number,
        offsetY: number;

      const isFullscreen =
        document.fullscreenElement === canvas ||
        document.fullscreenElement === canvas.parentElement;
      const hasLetterbox = isFullscreen && canvas.style.objectFit !== "fill";

      if (hasLetterbox && canvasAspectRatio !== containerAspectRatio) {
        if (canvasAspectRatio > containerAspectRatio) {
          renderWidth = rect.width;
          renderHeight = rect.width / canvasAspectRatio;
          offsetX = 0;
          offsetY = (rect.height - renderHeight) / 2;
        } else {
          renderWidth = rect.height * canvasAspectRatio;
          renderHeight = rect.height;
          offsetX = (rect.width - renderWidth) / 2;
          offsetY = 0;
        }
      } else {
        renderWidth = rect.width;
        renderHeight = rect.height;
        offsetX = 0;
        offsetY = 0;
      }

      const scaleX = canvas.width / renderWidth;
      const scaleY = canvas.height / renderHeight;

      const relativeX = clientX - rect.left - offsetX;
      const relativeY = clientY - rect.top - offsetY;

      const x = Math.max(
        0,
        Math.min(canvas.width - 1, Math.round(relativeX * scaleX)),
      );
      const y = Math.max(
        0,
        Math.min(canvas.height - 1, Math.round(relativeY * scaleY)),
      );

      return { x, y };
    },
    [canvas],
  );

  const sendCopyKeyCombination = useCallback(() => {
    if (!session || !ironrdp) return;

    try {
      const api = ironrdp as IronRDPAPI;
      const extSession = session as ExtendedRDPSession;
      const transaction = new api.InputTransaction();

      const ctrlScancode = isMacOS()
        ? codeToScancode.MetaLeft
        : codeToScancode.ControlLeft;
      const cScancode = codeToScancode.KeyC;

      if (ctrlScancode && cScancode) {
        const ctrlDown = api.DeviceEvent.keyPressed(ctrlScancode);
        transaction.addEvent(ctrlDown);

        const cDown = api.DeviceEvent.keyPressed(cScancode);
        transaction.addEvent(cDown);

        const cUp = api.DeviceEvent.keyReleased(cScancode);
        transaction.addEvent(cUp);

        const ctrlUp = api.DeviceEvent.keyReleased(ctrlScancode);
        transaction.addEvent(ctrlUp);

        extSession.applyInputs(transaction);
      }
    } catch (err) {
      console.error("Error sending copy key combination:", err);
    }
  }, [session, ironrdp, codeToScancode]);

  const sendPasteKeyCombination = useCallback(() => {
    if (!session || !ironrdp) return;

    try {
      const api = ironrdp as IronRDPAPI;
      const extSession = session as ExtendedRDPSession;
      const transaction = new api.InputTransaction();

      const ctrlScancode = isMacOS()
        ? codeToScancode.MetaLeft
        : codeToScancode.ControlLeft;
      const vScancode = codeToScancode.KeyV;

      if (ctrlScancode && vScancode) {
        const ctrlDown = api.DeviceEvent.keyPressed(ctrlScancode);
        transaction.addEvent(ctrlDown);

        const vDown = api.DeviceEvent.keyPressed(vScancode);
        transaction.addEvent(vDown);

        const vUp = api.DeviceEvent.keyReleased(vScancode);
        transaction.addEvent(vUp);

        const ctrlUp = api.DeviceEvent.keyReleased(ctrlScancode);
        transaction.addEvent(ctrlUp);

        extSession.applyInputs(transaction);
      }
    } catch (err) {
      console.error("Error sending paste key combination:", err);
    }
  }, [session, ironrdp, codeToScancode]);

  const sendTextAsKeystrokes = useCallback(
    (text: string) => {
      if (!session || !ironrdp) return;

      try {
        const api = ironrdp as IronRDPAPI;
        const extSession = session as ExtendedRDPSession;
        const transaction = new api.InputTransaction();

        // Send each character as unicode event
        for (let i = 0; i < text.length; i++) {
          const char = text.charAt(i);
          const deviceEvent = api.DeviceEvent.unicodePressed(char);
          transaction.addEvent(deviceEvent);
        }

        extSession.applyInputs(transaction);
      } catch (err) {
        console.error("Error sending paste text:", err);
      }
    },
    [session, ironrdp],
  );

  const releaseModifierKeys = useCallback(() => {
    if (!session || !ironrdp) return;

    try {
      const api = ironrdp as IronRDPAPI;
      const extSession = session as ExtendedRDPSession;
      const transaction = new api.InputTransaction();

      // Release all common modifier keys
      const modifierScancodes = [
        codeToScancode.ControlLeft, // Left Ctrl
        codeToScancode.ControlRight, // Right Ctrl
        codeToScancode.MetaLeft, // Left Meta/Windows
        codeToScancode.MetaRight, // Right Meta/Windows
        codeToScancode.ShiftLeft, // Left Shift
        codeToScancode.ShiftRight, // Right Shift
        codeToScancode.AltLeft, // Left Alt
        codeToScancode.AltRight, // Right Alt
      ];

      for (const scancode of modifierScancodes) {
        if (scancode !== undefined) {
          const keyUpEvent = api.DeviceEvent.keyReleased(scancode);
          transaction.addEvent(keyUpEvent);
        }
      }

      extSession.applyInputs(transaction);
    } catch (err) {
      console.error("Error releasing modifier keys:", err);
    }
  }, [session, ironrdp, codeToScancode]);

  const tryFallbackClipboardRead = useCallback(() => {
    try {
      // Create a temporary textarea to capture clipboard content
      const textarea = document.createElement("textarea");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);

      textarea.focus();

      // Check if 'paste' command is supported before using execCommand
      if (
        typeof document.queryCommandSupported === "function" &&
        document.queryCommandSupported("paste")
      ) {
        if (document.execCommand("paste")) {
          const text = textarea.value;
          if (text) {
            sendTextAsKeystrokes(text);
            // Release all modifier keys after paste to prevent them from sticking
            releaseModifierKeys();
          }
        }
      } else {
        console.warn("Clipboard paste is not supported in this browser.");
      }

      document.body.removeChild(textarea);
    } catch (err) {
      console.error("Fallback clipboard read failed:", err);
    }
  }, [sendTextAsKeystrokes, releaseModifierKeys]);

  const handleLocalClipboardPaste = useCallback(async () => {
    if (!navigator.clipboard?.readText) {
      console.warn("Clipboard API not available");
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) return;
      sendTextAsKeystrokes(clipboardText);
      releaseModifierKeys();
    } catch (err) {
      console.error("Failed to read from local clipboard:", err);
      tryFallbackClipboardRead();
    }
  }, [sendTextAsKeystrokes, releaseModifierKeys, tryFallbackClipboardRead]);

  const releaseAllKeys = useCallback(() => {
    if (!session || !ironrdp) return;

    keyStatesRef.current.forEach((pressed, code) => {
      if (!pressed) return;
      const scancode = codeToScancode[code];
      if (scancode === undefined) return;

      try {
        const api = ironrdp as IronRDPAPI;
        const extSession = session as ExtendedRDPSession;
        const deviceEvent = api.DeviceEvent.keyReleased(scancode);
        const transaction = new api.InputTransaction();
        transaction.addEvent(deviceEvent);
        extSession.applyInputs(transaction);
      } catch (err) {
        console.error("Error releasing key:", err);
      }
    });
    keyStatesRef.current.clear();
  }, [session, ironrdp, codeToScancode]);

  const releaseAllMouseButtons = useCallback(() => {
    if (!session || !ironrdp) return;

    try {
      const api = ironrdp as IronRDPAPI;
      const extSession = session as ExtendedRDPSession;
      const transaction = new api.InputTransaction();

      // Release all mouse buttons that are currently pressed
      Object.entries(mouseButtonStatesRef.current).forEach(
        ([buttonIndex, pressed]) => {
          if (pressed) {
            const button = mouseButtonMap[parseInt(buttonIndex)];
            if (button !== undefined) {
              const deviceEvent = api.DeviceEvent.mouseButtonReleased(button);
              transaction.addEvent(deviceEvent);
              mouseButtonStatesRef.current[parseInt(buttonIndex)] = false;
            }
          }
        },
      );

      if (transaction) {
        extSession.applyInputs(transaction);
      }
    } catch (err) {
      console.error("Error releasing mouse buttons:", err);
    }
  }, [session, ironrdp, mouseButtonMap]);

  const releaseAllInputs = useCallback(() => {
    releaseAllKeys();
    releaseAllMouseButtons();
    // Release touch state
    if (touchStateRef.current.touching) {
      touchStateRef.current = {
        lastX: 0,
        lastY: 0,
        touching: false,
        touchId: null,
      };
    }
  }, [releaseAllKeys, releaseAllMouseButtons]);

  const requestClipboardSync = useCallback(() => {
    if (!/Chrome/.test(navigator.userAgent)) return;

    if (
      window.IronRDPBridge &&
      (window.IronRDPBridge as any).checkAndSendClipboard
    ) {
      setTimeout(() => {
        (window.IronRDPBridge as any).checkAndSendClipboard();
      }, 50);
    }
  }, []);

  // Event handlers
  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (!canvas || !isActive || !session || !ironrdp) return;

      event.preventDefault();
      canvas.focus();

      const { x, y } = getCanvasCoordinates(event.clientX, event.clientY);
      const button = mouseButtonMap[event.button];
      if (button === undefined) return;
      if (mouseButtonStatesRef.current[event.button]) return;

      mouseButtonStatesRef.current[event.button] = true;

      try {
        const api = ironrdp as IronRDPAPI;
        const extSession = session as ExtendedRDPSession;
        const transaction = new api.InputTransaction();

        const moveEvent = api.DeviceEvent.mouseMove(x, y);
        const clickEvent = api.DeviceEvent.mouseButtonPressed(button);

        transaction.addEvent(moveEvent);
        transaction.addEvent(clickEvent);
        extSession.applyInputs(transaction);

        currentMouseRef.current = { x, y };
      } catch (err) {
        console.error("Error sending mouse down:", err);
      }
    },
    [canvas, isActive, session, ironrdp, getCanvasCoordinates, mouseButtonMap],
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (!canvas || !isActive || !session || !ironrdp) return;

      event.preventDefault();
      const button = mouseButtonMap[event.button];
      if (button === undefined) return;
      if (!mouseButtonStatesRef.current[event.button]) return;

      mouseButtonStatesRef.current[event.button] = false;

      try {
        const api = ironrdp as IronRDPAPI;
        const extSession = session as ExtendedRDPSession;
        const deviceEvent = api.DeviceEvent.mouseButtonReleased(button);
        const transaction = new api.InputTransaction();
        transaction.addEvent(deviceEvent);
        extSession.applyInputs(transaction);
      } catch (err) {
        console.error("Error sending mouse up:", err);
      }
    },
    [canvas, isActive, session, ironrdp, mouseButtonMap],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!canvas || !session || !ironrdp) return;

      const { x, y } = getCanvasCoordinates(event.clientX, event.clientY);

      if (x === currentMouseRef.current.x && y === currentMouseRef.current.y) {
        return;
      }

      currentMouseRef.current = { x, y };

      try {
        const api = ironrdp as IronRDPAPI;
        const extSession = session as ExtendedRDPSession;
        const deviceEvent = api.DeviceEvent.mouseMove(x, y);
        const transaction = new api.InputTransaction();
        transaction.addEvent(deviceEvent);
        extSession.applyInputs(transaction);
      } catch (err) {
        console.error("Error sending mouse move:", err);
      }
    },
    [canvas, session, ironrdp, getCanvasCoordinates],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!isActive || !session || !ironrdp) return;

      event.preventDefault();
      const delta = event.deltaY > 0 ? -1 : 1;
      const rotationUnits = delta * 120;

      try {
        const api = ironrdp as IronRDPAPI;
        const extSession = session as ExtendedRDPSession;
        const deviceEvent = api.DeviceEvent.wheelRotations(true, rotationUnits);
        const transaction = new api.InputTransaction();
        transaction.addEvent(deviceEvent);
        extSession.applyInputs(transaction);
      } catch (err) {
        console.error("Error sending wheel event:", err);
      }
    },
    [isActive, session, ironrdp],
  );

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!canvas || !isActive || !session || !ironrdp) return;

      event.preventDefault();
      canvas.focus();

      // Only handle single touch (first touch)
      if (event.touches.length > 0 && !touchStateRef.current.touching) {
        const touch = event.touches[0];
        const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);

        touchStateRef.current = {
          lastX: x,
          lastY: y,
          touching: true,
          touchId: touch.identifier,
        };

        try {
          const api = ironrdp as IronRDPAPI;
          const extSession = session as ExtendedRDPSession;
          const transaction = new api.InputTransaction();

          const moveEvent = api.DeviceEvent.mouseMove(x, y);
          const clickEvent = api.DeviceEvent.mouseButtonPressed(0); // Left click

          transaction.addEvent(moveEvent);
          transaction.addEvent(clickEvent);
          extSession.applyInputs(transaction);

          currentMouseRef.current = { x, y };
        } catch (err) {
          console.error("Error sending touch start:", err);
        }
      }
    },
    [canvas, isActive, session, ironrdp, getCanvasCoordinates],
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!canvas || !isActive || !session || !ironrdp) return;

      event.preventDefault();

      // Check if our tracked touch ended
      if (touchStateRef.current.touching) {
        const touchEnded = Array.from(event.changedTouches).some(
          (touch) => touch.identifier === touchStateRef.current.touchId,
        );

        if (touchEnded || event.touches.length === 0) {
          try {
            const api = ironrdp as IronRDPAPI;
            const extSession = session as ExtendedRDPSession;
            const deviceEvent = api.DeviceEvent.mouseButtonReleased(0); // Left click
            const transaction = new api.InputTransaction();
            transaction.addEvent(deviceEvent);
            extSession.applyInputs(transaction);

            touchStateRef.current = {
              lastX: 0,
              lastY: 0,
              touching: false,
              touchId: null,
            };
          } catch (err) {
            console.error("Error sending touch end:", err);
          }
        }
      }
    },
    [canvas, isActive, session, ironrdp],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!canvas || !session || !ironrdp || !touchStateRef.current.touching) return;

      event.preventDefault();

      // Find our tracked touch
      const currentTouch = Array.from(event.touches).find(
        (touch) => touch.identifier === touchStateRef.current.touchId,
      );

      if (currentTouch) {
        const { x, y } = getCanvasCoordinates(currentTouch.clientX, currentTouch.clientY);

        if (x === touchStateRef.current.lastX && y === touchStateRef.current.lastY) {
          return;
        }

        touchStateRef.current.lastX = x;
        touchStateRef.current.lastY = y;
        currentMouseRef.current = { x, y };

        try {
          const api = ironrdp as IronRDPAPI;
          const extSession = session as ExtendedRDPSession;
          const deviceEvent = api.DeviceEvent.mouseMove(x, y);
          const transaction = new api.InputTransaction();
          transaction.addEvent(deviceEvent);
          extSession.applyInputs(transaction);
        } catch (err) {
          console.error("Error sending touch move:", err);
        }
      }
    },
    [canvas, session, ironrdp, getCanvasCoordinates],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive || !session || !ironrdp) return;

      const isLocalClipboardPaste =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "v";

      if (isLocalClipboardPaste) {
        event.preventDefault();
        handleLocalClipboardPaste();
        return;
      }

      const isClipboardPaste =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v";
      const isClipboardCopy =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";

      // Handle copy directly in keydown as fallback if clipboard events don't work
      if (isClipboardCopy && document.activeElement === canvas) {
        event.preventDefault();
        sendCopyKeyCombination();
        return;
      }

      // Handle paste directly in keydown as fallback if clipboard events don't work
      if (isClipboardPaste && document.activeElement === canvas) {
        event.preventDefault();
        sendPasteKeyCombination();
        return;
      }

      if (!isClipboardPaste && !isClipboardCopy) {
        event.preventDefault();
      }

      const isChromium = /Chrome/.test(navigator.userAgent);
      if ((isClipboardPaste || isClipboardCopy) && isChromium) {
        return;
      }

      const scancode = codeToScancode[event.code];
      if (scancode !== undefined) {
        try {
          const api = ironrdp as IronRDPAPI;
          const extSession = session as ExtendedRDPSession;
          const deviceEvent = api.DeviceEvent.keyPressed(scancode);
          const transaction = new api.InputTransaction();
          transaction.addEvent(deviceEvent);
          extSession.applyInputs(transaction);
        } catch (err) {
          console.error("Error sending key down:", err);
        }
      } else if (event.key.length === 1) {
        try {
          const api = ironrdp as IronRDPAPI;
          const extSession = session as ExtendedRDPSession;
          const deviceEvent = api.DeviceEvent.unicodePressed(event.key);
          const transaction = new api.InputTransaction();
          transaction.addEvent(deviceEvent);
          extSession.applyInputs(transaction);
        } catch (err) {
          console.error("Error sending unicode char:", err);
        }
      }
    },
    [
      isActive,
      session,
      ironrdp,
      codeToScancode,
      canvas,
      sendCopyKeyCombination,
      sendPasteKeyCombination,
      handleLocalClipboardPaste,
    ],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive || !session || !ironrdp) return;

      const isLocalClipboardPaste =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "v";
      if (isLocalClipboardPaste) {
        event.preventDefault();
        return;
      }

      const isClipboardPaste =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v";
      const isClipboardCopy =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";

      if (!isClipboardPaste && !isClipboardCopy) {
        event.preventDefault();
      }

      const isChromium = /Chrome/.test(navigator.userAgent);
      if ((isClipboardPaste || isClipboardCopy) && isChromium) {
        return;
      }

      const scancode = codeToScancode[event.code];
      if (scancode === undefined) return;

      try {
        const api = ironrdp as IronRDPAPI;
        const extSession = session as ExtendedRDPSession;
        const deviceEvent = api.DeviceEvent.keyReleased(scancode);
        const transaction = new api.InputTransaction();
        transaction.addEvent(deviceEvent);
        extSession.applyInputs(transaction);
      } catch (err) {
        console.error("Error sending key up:", err);
      }
    },
    [isActive, session, ironrdp, codeToScancode],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (!isActive) return;

      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      const text = clipboardData.getData("text/plain");
      if (!text) return;

      event.preventDefault();
      sendPasteKeyCombination();
    },
    [isActive, sendPasteKeyCombination],
  );

  const handleCopy = useCallback(
    (event: ClipboardEvent) => {
      if (!isActive) {
        return;
      }
      sendCopyKeyCombination();
    },
    [isActive, sendCopyKeyCombination],
  );

  const handleFocus = useCallback(() => {
    setIsActive(true);
    requestClipboardSync();
  }, [requestClipboardSync]);

  const handleBlur = useCallback(() => {
    setIsActive(false);
    releaseAllInputs();
  }, [releaseAllInputs]);

  const handleClick = useCallback(() => {
    if (canvas) {
      canvas.focus();
      requestClipboardSync();

      setTimeout(() => {
        if (document.activeElement !== canvas) {
          canvas.focus();
        }
      }, 10);
    }
  }, [canvas, requestClipboardSync]);

  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive) return;

      if (e.key === "F11") {
        e.preventDefault();
        if (window.toggleFullscreen) {
          window.toggleFullscreen();
        }
      } else if (e.ctrlKey && e.altKey && e.key === "Enter") {
        e.preventDefault();
        if (window.toggleFullscreen) {
          window.toggleFullscreen();
        }
      }
    },
    [isActive],
  );

  const preventContextMenu = useCallback((e: Event) => e.preventDefault(), []);

  const handleMouseLeave = useCallback(() => {
    releaseAllInputs();
  }, [releaseAllInputs]);

  const handleWindowMouseLeave = useCallback(
    (e: MouseEvent) => {
      if (
        e.clientY <= 0 ||
        e.clientX <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        releaseAllInputs();
      }
    },
    [releaseAllInputs],
  );

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      releaseAllInputs();
    }
  }, [releaseAllInputs]);

  /**
   * Setup all necessary event listeners on the canvas
   */
  const setupEventListeners = useCallback(() => {
    if (!canvas) return null;

    // Clean up any existing handler for this canvas first
    const existingCleanup = activeHandlers.get(canvas);
    if (existingCleanup) {
      existingCleanup();
    }

    canvas.tabIndex = 1;
    canvas.style.outline = "none";

    // Add all event listeners
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseenter", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("wheel", handleWheel);
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchmove", handleTouchMove);
    canvas.addEventListener("contextmenu", preventContextMenu);
    canvas.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("paste", handlePaste);
    canvas.addEventListener("copy", handleCopy);

    canvas.addEventListener("focus", handleFocus);
    canvas.addEventListener("blur", handleBlur);
    canvas.addEventListener("click", handleClick);

    document.addEventListener("keydown", handleGlobalKeyDown);

    // Window-level event listeners for input cleanup
    document.addEventListener("mouseleave", handleWindowMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Create cleanup function
    const cleanup = () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseenter", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("contextmenu", preventContextMenu);
      canvas.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("paste", handlePaste);
      canvas.removeEventListener("copy", handleCopy);

      canvas.removeEventListener("focus", handleFocus);
      canvas.removeEventListener("blur", handleBlur);
      canvas.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleGlobalKeyDown);

      // Remove window-level listeners
      document.removeEventListener("mouseleave", handleWindowMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      releaseAllInputs();
      // Don't set isActive false here - let blur event handle it
      activeHandlers.delete(canvas);
    };

    // Register this handler
    activeHandlers.set(canvas, cleanup);

    return cleanup;
  }, [
    canvas,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleMouseLeave,
    handleWheel,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    preventContextMenu,
    handleKeyDown,
    handleKeyUp,
    handlePaste,
    handleCopy,
    handleFocus,
    handleBlur,
    handleClick,
    handleGlobalKeyDown,
    handleWindowMouseLeave,
    handleVisibilityChange,
    releaseAllInputs,
  ]);

  /**
   * Auto-focus canvas when connection is established
   */
  useEffect(() => {
    if (isConnected && canvas) {
      const timeoutId = setTimeout(() => {
        if (document.activeElement !== canvas) {
          canvas.focus();
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, canvas]);

  /**
   * Setup event listeners when connected and canvas/session are available
   */
  useEffect(() => {
    if (isConnected && ironrdp && session && canvas) {
      setupEventListeners();
    }
  }, [isConnected, ironrdp, session, canvas, setupEventListeners]);

  /**
   * Cleanup event listeners when canvas changes or component unmounts
   */
  useEffect(() => {
    return () => {
      if (canvas) {
        const existingCleanup = activeHandlers.get(canvas);
        if (existingCleanup) {
          existingCleanup();
        }
      }
    };
  }, [canvas]);

  /**
   * Function to manually focus the canvas and ensure it receives input
   */
  const focusCanvas = useCallback(() => {
    if (canvas) canvas.focus();
  }, [canvas]);

  return {
    isActive,
    focusCanvas,
  };
};
