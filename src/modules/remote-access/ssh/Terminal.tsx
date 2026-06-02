"use client";

import "@xterm/xterm/css/xterm.css";
import { cn } from "@utils/helpers";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef } from "react";

const DARK_TERMINAL_THEME = {
  background: "#181a1d",
  foreground: "#e4e7e9",
  cursor: "#e4e7e9",
  selectionBackground: "#3a3f44",
};

const LIGHT_TERMINAL_THEME = {
  background: "#ffffff",
  foreground: "#181a1d",
  cursor: "#181a1d",
  selectionBackground: "#d4d7d9",
};

const TERMINAL_OPTIONS = {
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
  fontSize: 13,
  cursorBlink: true,
  convertEol: true,
  scrollback: 1000,
  allowTransparency: true,
};

interface TerminalWithCore {
  _core?: { _isDisposed: boolean };
  options: { theme?: Record<string, string> };
  dispose(): void;
  write(data: string | Uint8Array): void;
  writeln(data: string): void;
  onData(callback: (data: string) => void): void;
  onResize(callback: (event: { cols: number; rows: number }) => void): void;
  focus(): void;
  cols: number;
  rows: number;
}

interface SSHTerminalWrapperProps {
  session: any;
  onResize?: (cols: number, rows: number) => void;
  onClose?: () => void;
  className?: string;
}

export const Terminal = ({
  session,
  onResize,
  onClose,
  className = "",
}: SSHTerminalWrapperProps) => {
  const { resolvedTheme } = useTheme();
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<{
    terminal: TerminalWithCore;
    fitAddon: any;
  } | null>(null);
  const handlersSetRef = useRef(false);

  const terminalTheme = useMemo(
    () =>
      resolvedTheme === "light" ? LIGHT_TERMINAL_THEME : DARK_TERMINAL_THEME,
    [resolvedTheme],
  );

  const fitTerminal = useCallback(() => {
    if (terminalInstanceRef.current?.fitAddon) {
      terminalInstanceRef.current.fitAddon.fit();
    }
  }, []);

  const initializeTerminal = useCallback(async () => {
    if (terminalInstanceRef.current || !terminalRef.current) return;

    const { Terminal: XTerminal } = await import("@xterm/xterm");
    const { FitAddon } = await import("@xterm/addon-fit");

    const terminal = new XTerminal({
      ...TERMINAL_OPTIONS,
      theme: terminalTheme,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    if (!terminalRef.current) return;
    terminalRef.current.innerHTML = "";
    terminal.open(terminalRef.current);

    // Set terminal focus behavior
    const terminalElement = terminalRef.current.querySelector(
      ".xterm",
    ) as HTMLElement;
    if (terminalElement) {
      terminalElement.setAttribute("tabindex", "0");
      terminalElement.addEventListener("click", () => terminal.focus());
      terminalElement.addEventListener("keydown", (e) => e.stopPropagation());
    }

    terminalInstanceRef.current = {
      terminal: terminal as TerminalWithCore,
      fitAddon,
    };

    // Initial fit with delay to ensure proper sizing
    setTimeout(fitTerminal, 100);

    return terminal as TerminalWithCore;
  }, [fitTerminal, terminalTheme]);

  const setupSSHHandlers = useCallback(async () => {
    if (!session || handlersSetRef.current) return;

    const terminal = await initializeTerminal();
    if (!terminal) return;

    handlersSetRef.current = true;

    // Setup terminal event handlers
    terminal.onData((data: string) => session?.write?.(data));
    terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      session?.resize?.(cols, rows);
      onResize?.(cols, rows);
    });

    // Setup SSH event handlers
    session.ondata = (data: Uint8Array) => {
      if (!terminal._core?._isDisposed) {
        terminal.write(new Uint8Array(data));
      }
    };

    const originalOnClose = session.onclose;
    session.onclose = () => {
      if (!terminal._core?._isDisposed) {
        terminal.writeln("\r\n*** Connection closed ***");
      }
      handlersSetRef.current = false;
      originalOnClose?.();
      onClose?.();
    };

    // Final setup with proper sizing
    setTimeout(() => {
      if (
        terminalInstanceRef.current?.fitAddon &&
        !terminal._core?._isDisposed
      ) {
        fitTerminal();
        session?.resize?.(terminal.cols, terminal.rows);
        terminal.focus();
      }
    }, 200);
  }, [session, initializeTerminal, onResize, onClose, fitTerminal]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => fitTerminal();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fitTerminal]);

  // Setup SSH handlers when session changes
  useEffect(() => {
    setupSSHHandlers().then();
  }, [setupSSHHandlers]);

  // Apply theme changes to an already-running terminal
  useEffect(() => {
    const terminal = terminalInstanceRef.current?.terminal;
    if (terminal && !terminal._core?._isDisposed) {
      terminal.options.theme = terminalTheme;
    }
  }, [terminalTheme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (terminalInstanceRef.current?.terminal) {
        const terminal = terminalInstanceRef.current.terminal;
        if (!terminal._core?._isDisposed) {
          terminal.dispose();
        }
        terminalInstanceRef.current = null;
      }
      handlersSetRef.current = false;
    };
  }, []);

  return (
    <div
      ref={terminalRef}
      className={cn("w-full h-full flex flex-col m-0 p-0", className)}
    />
  );
};
