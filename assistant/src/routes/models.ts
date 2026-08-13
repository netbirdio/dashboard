/**
 * GET /v1/models — the models a client may select, so the dashboard's model
 * selector is server-driven (no hardcoded list to keep in sync). Authenticated
 * but not rate/usage limited; the payload is not account-specific.
 */
import { selectableModels } from "@/llm/models.ts";

export function models(): Response {
  return Response.json({ models: selectableModels() });
}
