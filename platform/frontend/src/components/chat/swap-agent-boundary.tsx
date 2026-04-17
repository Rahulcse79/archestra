"use client";

import {
  type ArchestraToolShortName,
  PERSISTED_CHAT_ERROR_PART_TYPE,
  TOOL_SWAP_AGENT_SHORT_NAME,
  TOOL_SWAP_TO_DEFAULT_AGENT_SHORT_NAME,
} from "@shared";
import {
  extractSwapTargetAgentName,
  getRenderedToolName,
  getSwapToolShortName,
  type SwapToolPart as ToolPart,
} from "@/lib/chat/swap-agent.utils";
import { MessageBoundaryDivider } from "./message-boundary-divider";

export function SwapAgentBoundaryDivider({
  parts,
  getToolShortName,
  hasToolError,
  shouldRender = true,
}: {
  parts: ToolPart[];
  getToolShortName?: (toolName: string) => ArchestraToolShortName | null;
  hasToolError: (part: ToolPart, allParts: ToolPart[]) => boolean;
  shouldRender?: boolean;
}) {
  if (!shouldRender) {
    return null;
  }

  const label = getSwapAgentBoundaryLabel({
    parts,
    getToolShortName,
    hasToolError,
  });

  return label ? <MessageBoundaryDivider label={label} /> : null;
}

export function getSwapAgentBoundaryLabel({
  parts,
  getToolShortName,
  hasToolError,
}: {
  parts: ToolPart[];
  getToolShortName?: (toolName: string) => ArchestraToolShortName | null;
  hasToolError: (part: ToolPart, allParts: ToolPart[]) => boolean;
}): string | null {
  if (
    parts.some(
      (part) =>
        typeof part.type === "string" &&
        part.type === PERSISTED_CHAT_ERROR_PART_TYPE,
    )
  ) {
    return null;
  }

  for (const part of parts) {
    const toolName = getRenderedToolName(part);
    if (!toolName) continue;

    const swapToolShortName = getSwapToolShortName({
      toolName,
      getToolShortName,
    });
    if (
      swapToolShortName !== TOOL_SWAP_AGENT_SHORT_NAME &&
      swapToolShortName !== TOOL_SWAP_TO_DEFAULT_AGENT_SHORT_NAME
    ) {
      continue;
    }

    if (hasToolError(part, parts)) {
      return null;
    }

    const isSwapToDefault =
      swapToolShortName === TOOL_SWAP_TO_DEFAULT_AGENT_SHORT_NAME;
    const agentName = isSwapToDefault
      ? "default agent"
      : (extractSwapTargetAgentName(part) ?? "another agent");

    return `Switched to ${agentName}`;
  }

  return null;
}
