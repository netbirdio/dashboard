// The assistant runtime: what the chat panel and the canvas bridge import.
// Hooks and contexts are re-exported by name,
// so adding a symbol to one of them cannot widen the public API by accident.
export * from "./lib/canvas";
export * from "./lib/contract";
export * from "./lib/control-center";
export type { ManagementFetch, ManagementResponse } from "./lib/reads";
export * from "./lib/tools";
export { Vault } from "./lib/vault";
// Only the error copy is public;
// session-client.ts also holds the HTTP call the hooks use and no consumer should.
export type { AssistantProviderProps } from "./contexts/AssistantContext";
export { AssistantProvider } from "./contexts/AssistantContext";
export { useAgentBusy } from "./hooks/useAgentBusy";
export {
  type AssistantStatus,
  useAssistant,
  type UseAssistantResult,
  useAssistantRuntime,
} from "./hooks/useAssistant";
export { useAssistantAvailable } from "./hooks/useAssistantAvailable";
export { thinkingStatus } from "./hooks/useAssistantStatus";
export {
  acceptsFreeText,
  type PendingInputRequest,
} from "./hooks/useBrowserToolLoop";
export {
  AssistantHttpError,
  describeAssistantError,
  ERROR_MESSAGES,
  serverFailure,
} from "./lib/session-client";
