import type { ThreadMessageLike } from "@assistant-ui/react";
import type { EveDynamicToolPart, EveMessage } from "eve/react";
import { restoreToolInput, type Vault } from "./vault";

type MessageContent = Exclude<ThreadMessageLike["content"], string>;
type MessagePart = MessageContent[number];
type ToolCallPart = Extract<MessagePart, { type: "tool-call" }>;

/** True while a tool part still owes its real result, including a browser tool the dashboard is running. */
export function isRunningToolPart(part: EveDynamicToolPart): boolean {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
    case "approval-requested":
    case "approval-responded":
      return true;
    case "output-available":
      return part.partial === true;
    default:
      return false;
  }
}

const RENDER_COMPONENT = "render_component";

function objectArgs(value: unknown): ToolCallPart["args"] {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ToolCallPart["args"])
    : undefined;
}

/**
 * The `render_component` card is drawn from the call's args,
 * so they must be the payload the agent validated, not the model's raw input.
 * An empty object, which renders nothing, stands in until that payload exists.
 */
function validatedComponentArgs(part: EveDynamicToolPart): ToolCallPart["args"] {
  if (part.state !== "output-available" || isRunningToolPart(part)) return {};
  const output = part.output as { ok?: unknown; component?: unknown } | undefined;
  if (!output || typeof output !== "object" || output.ok !== true) return {};
  return objectArgs(output.component) ?? {};
}

function toToolCallPart(part: EveDynamicToolPart): ToolCallPart {
  const rendersFromArgs = part.toolName === RENDER_COMPONENT;
  const args = rendersFromArgs
    ? validatedComponentArgs(part)
    : objectArgs(part.input);
  const base = {
    type: "tool-call" as const,
    toolCallId: part.toolCallId,
    toolName: part.toolName,
    args,
    argsText: JSON.stringify((rendersFromArgs ? args : part.input) ?? {}),
  };

  if (isRunningToolPart(part)) return base;
  switch (part.state) {
    case "output-available":
      return { ...base, result: part.output };
    case "output-error":
      return { ...base, result: part.errorText, isError: true };
    case "output-denied":
      return {
        ...base,
        result: part.approval.reason ?? "denied",
        isError: true,
      };
    default:
      return base;
  }
}

function messageStatus(
  message: EveMessage,
): ThreadMessageLike["status"] | undefined {
  if (message.role !== "assistant") return undefined;
  switch (message.metadata?.status) {
    case "streaming":
      return { type: "running" };
    case "failed":
      return { type: "incomplete", reason: "error" };
    default:
      return { type: "complete", reason: "stop" };
  }
}

/**
 * The message as a person reads it: the model's tokens back to names.
 * Text still streaming holds back a token it has not finished writing.
 * Tool inputs restore as the browser runs them, ids to ids and names to names,
 * so a card or a trail row reads what the call did.
 */
export function restoreEveMessage(vault: Vault, message: EveMessage): EveMessage {
  if (vault.size === 0) return message;
  const streaming = message.metadata?.status === "streaming";
  const text = streaming ? vault.restoreStreamingText : vault.restoreText;
  // The model's text parts render as markdown; the person's own render as
  // typed, and reasoning is never shown as markup.
  const markdown = streaming ? vault.restoreStreamingMarkdown : vault.restoreMarkdown;
  const prose = message.role === "user" ? text : markdown;
  const parts = message.parts.map((part) => {
    switch (part.type) {
      case "text":
        return { ...part, text: prose(part.text) };
      case "reasoning":
        return { ...part, text: text(part.text) };
      case "dynamic-tool": {
        const restored = { ...part, input: restoreToolInput(vault, part.toolName, part.input) } as EveDynamicToolPart;
        if ("output" in part && part.output !== undefined) {
          (restored as { output: unknown }).output =
            part.toolName === RENDER_COMPONENT && part.output && typeof part.output === "object"
              ? { ...part.output, component: restoreToolInput(vault, part.toolName, (part.output as { component?: unknown }).component) }
              : vault.restoreValue(part.output, "display");
        }
        if ("errorText" in part && typeof part.errorText === "string") {
          (restored as { errorText: string }).errorText = vault.restoreText(part.errorText);
        }
        return restored;
      }
      default:
        return part;
    }
  });
  return { ...message, parts };
}

/**
 * Maps one eve message to a ThreadMessageLike.
 * Question parts are dropped, since the host renders them as cards rather than tool rows.
 */
export function convertEveMessage(message: EveMessage): ThreadMessageLike {
  const content: MessagePart[] = [];
  for (const part of message.parts) {
    switch (part.type) {
      case "text":
        content.push({ type: "text", text: part.text });
        break;
      case "reasoning":
        content.push({ type: "reasoning", text: part.text });
        break;
      case "dynamic-tool":
        if (part.toolName === "ask_question") break;
        content.push(toToolCallPart(part));
        break;
      default:
        // file, step-start and authorization parts are not rendered
        break;
    }
  }
  return {
    id: message.id,
    role: message.role,
    content,
    status: messageStatus(message),
  };
}

