/**
 * Usage limit — reject (402) before the model call once a token ceiling is hit.
 * Bounds tokens processed (tokens/day, tokens/month) on the provider key; rate
 * limiting bounds burst.
 */
import { loadConfig } from "@/config.ts";
import { getUsage } from "@/telemetry/store.ts";
import type { Middleware } from "@/http/compose.ts";

export const usageLimit: Middleware = async (_req, ctx) => {
  const cfg = loadConfig();
  const { accountId, userId } = ctx.principal!;
  const used = await getUsage({ accountId, userId });

  const over =
    used.userDaily >= cfg.LIMIT_USER_DAILY_TOKENS ||
    used.userMonthly >= cfg.LIMIT_USER_MONTHLY_TOKENS ||
    used.accountDaily >= cfg.LIMIT_ACCOUNT_DAILY_TOKENS ||
    used.accountMonthly >= cfg.LIMIT_ACCOUNT_MONTHLY_TOKENS;

  if (over) {
    ctx.rejection = "usage_limit";
    return Response.json(
      { error: "usage_limit_reached", message: "AI usage limit reached. Try again later." },
      { status: 402 },
    );
  }
  return undefined;
};
