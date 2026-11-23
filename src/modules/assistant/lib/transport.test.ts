import { afterEach, expect, it, vi } from "vitest";
import { SESSION_ID_HEADER } from "./contract";
import { cancelTurn, streamEvents } from "./transport";

afterEach(() => vi.unstubAllGlobals());

it("closes the stream before refusing one that answers for another chat", async () => {
  const cancel = vi.fn();
  const body = new ReadableStream({ cancel });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { headers: { [SESSION_ID_HEADER]: "other" } })),
  );

  const events = streamEvents({ host: "https://assistant.test", headers: async () => ({}) }, "mine", {
    startIndex: 0,
    signal: new AbortController().signal,
  });

  await expect(events.next()).rejects.toMatchObject({ status: 502 });
  expect(cancel).toHaveBeenCalledTimes(1);
});

const options = { host: "https://assistant.test", headers: async () => ({}) };

function serveStream(...chunks: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { headers: { [SESSION_ID_HEADER]: "mine" } })),
  );
}

async function collect(onOpen?: () => void) {
  const events: unknown[] = [];
  const stream = streamEvents(options, "mine", { startIndex: 0, signal: new AbortController().signal, onOpen });
  for await (const event of stream) events.push(event);
  return events;
}

it("drops a line the connection cut short instead of failing on it", async () => {
  serveStream('{"type":"turn.started","data":{}}\n{"type":"turn.comp');

  await expect(collect()).resolves.toEqual([{ type: "turn.started", data: {} }]);
});

it("still yields a whole last line that has no newline after it", async () => {
  serveStream('{"type":"turn.started","data":{}}');

  await expect(collect()).resolves.toEqual([{ type: "turn.started", data: {} }]);
});

it("fails on a malformed line that arrived whole", async () => {
  serveStream('{"type":"turn.sta\n{"type":"turn.completed","data":{}}\n');

  await expect(collect()).rejects.toBeInstanceOf(SyntaxError);
});

it("reports the connection as open before the first event", async () => {
  serveStream('{"type":"turn.started","data":{}}\n');
  const onOpen = vi.fn();

  await collect(onOpen);

  expect(onOpen).toHaveBeenCalledTimes(1);
});

it("gives the cancel request the caller's signal", async () => {
  const fetch = vi.fn(async () => Response.json({}));
  vi.stubGlobal("fetch", fetch);
  const { signal } = new AbortController();

  await cancelTurn(options, "mine", signal);

  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/mine/cancel"), expect.objectContaining({ signal }));
});
