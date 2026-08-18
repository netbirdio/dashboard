import type { RejectionReason } from "@/instrumentation/metrics.ts";

// Hono environment: per-request variables shared between middleware and handlers.
export type AppEnv = {
  Variables: {
    requestId: string;
    principal: Principal;
    rejection?: RejectionReason;
  };
};

export type MutableCtx = Partial<RequestCtx> & {
  requestId: string;
  rejection?: RejectionReason;
  conversationId?: string;
};

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface Principal {
  userId: string;

  accountId: string;
}

export interface RequestCtx {
  requestId: string;
  principal: Principal;
}

export type ModelTier = "main" | "fast";

export type ProviderName = "anthropic";

export type Task = "chat" | "guardrail" | "suggestions";

export interface TelemetryRow {
  requestId: string;
  conversationId?: string;
  accountId: string;
  userId: string;
  provider: ProviderName;
  model: string;
  task: Task;
  usage: Usage;
  latencyMs: number;
  stopReason: string | null;
  toolCallsRequested: number;
  createdAt: Date;
}
