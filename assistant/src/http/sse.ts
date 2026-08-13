/**
 * Server-Sent Events over a ReadableStream. Each event is
 * `event: <type>\ndata: <json>\n\n`.
 */
export interface SSEChannel {
  response: Response;
  send(event: string, data: unknown): void;
  close(): void;
}

export function createSSE(): SSEChannel {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      closed = true;
    },
  });

  // Enqueueing after the client disconnects throws; swallow it so a dropped
  // connection never crashes the out-of-band streaming task.
  const write = (chunk: string) => {
    if (closed) return;
    try {
      controller.enqueue(encoder.encode(chunk));
    } catch {
      closed = true;
    }
  };

  const response = new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });

  return {
    response,
    send(event, data) {
      write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    close() {
      if (closed) return;
      closed = true;
      try {
        controller.close();
      } catch {
        // already closed
      }
    },
  };
}
