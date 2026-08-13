/**
 * A tiny middleware chain for native Bun.serve (there is no app.use()). Each
 * Middleware returns a Response to short-circuit or undefined to pass through,
 * mutating `ctx` as it goes; the final Handler produces the Response.
 *   const handler = compose("/v1/chat", [cors, auth, rateLimit, usageLimit], chat);
 *
 * The route name is here only so refusals can be counted with *why* they were
 * refused: whoever sets `ctx.rejection` knows that, and a status code doesn't.
 */
import { countRejection, reasonFromStatus } from "@/telemetry/metrics.ts";
import type { RequestCtx } from "@/types.ts";
import type { RejectionReason } from "@/telemetry/metrics.ts";

/** A partially-built ctx: middlewares fill it in as the chain runs. */
export type MutableCtx = Partial<RequestCtx> & {
  requestId: string;
  startedAt: number;
  /** Set by whatever refuses the request, so /metrics can say why. */
  rejection?: RejectionReason;
  /**
   * The caller's conversation id, once the body has been read. Every model call
   * this request makes — the answer, the guardrail screen, the suggestion pass —
   * records it, which is what makes "cost per chat" a query rather than a guess.
   */
  conversationId?: string;
};

export type Middleware = (
  req: Request,
  ctx: MutableCtx,
) => Response | undefined | Promise<Response | undefined>;

export type Handler = (req: Request, ctx: MutableCtx) => Response | Promise<Response>;

export function compose(route: string, middlewares: Middleware[], handler: Handler) {
  return async (req: Request): Promise<Response> => {
    const ctx: MutableCtx = {
      requestId: crypto.randomUUID(),
      startedAt: performance.now(),
    };
    const refused = (res: Response): Response => {
      if (res.status >= 400) {
        countRejection(route, ctx.rejection ?? reasonFromStatus(res.status));
      }
      return res;
    };
    try {
      for (const mw of middlewares) {
        const short = await mw(req, ctx);
        if (short) return refused(short);
      }
      return refused(await handler(req, ctx));
    } catch (err) {
      // Log the reason with the requestId, but never the request body or token.
      console.error(`[${ctx.requestId}] unhandled error:`, (err as Error)?.message ?? err);
      countRejection(route, "internal_error");
      return Response.json({ error: "internal_error", requestId: ctx.requestId }, { status: 500 });
    }
  };
}
