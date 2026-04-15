import { describe, expect, test } from "vitest";
import { normalizeChatMessages } from "./normalize-chat-messages";

describe("normalizeChatMessages", () => {
  test("dedupes duplicate tool parts with the same toolCallId", () => {
    const messages = [
      {
        id: "msg1",
        role: "assistant" as const,
        parts: [
          { type: "text", text: "Creating the agent now." },
          {
            type: "tool-archestra__create_agent",
            toolCallId: "call_create_1",
            state: "output-available",
            output: "created",
          },
          {
            type: "tool-archestra__create_agent",
            toolCallId: "call_create_1",
            state: "output-available",
            output: "created",
          },
          {
            type: "tool-archestra__swap_agent",
            toolCallId: "call_swap_1",
            state: "output-available",
            output: "swapped",
          },
          {
            type: "tool-archestra__swap_agent",
            toolCallId: "call_swap_1",
            state: "output-available",
            output: "swapped",
          },
        ],
      },
    ];

    const result = normalizeChatMessages(messages);
    const dedupedParts = result[0].parts ?? [];

    expect(dedupedParts).toHaveLength(3);
    expect(
      dedupedParts.filter((part) => part.toolCallId === "call_create_1"),
    ).toHaveLength(1);
    expect(
      dedupedParts.filter((part) => part.toolCallId === "call_swap_1"),
    ).toHaveLength(1);
  });

  test("drops assistant messages left empty after stripping dangling tool calls", () => {
    const messages = [
      {
        id: "msg1",
        role: "user" as const,
        parts: [{ type: "text", text: "Do something" }],
      },
      {
        id: "msg2",
        role: "assistant" as const,
        parts: [
          {
            type: "tool-call",
            toolCallId: "dangling_call_1",
            toolName: "some_tool",
            state: "input-available",
            args: {},
          },
        ],
      },
      {
        id: "msg3",
        role: "user" as const,
        parts: [{ type: "text", text: "What happened?" }],
      },
    ];

    const result = normalizeChatMessages(messages);

    // The assistant message with only a dangling tool call should be removed
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual(["msg1", "msg3"]);
  });

  test("keeps assistant messages with remaining parts after stripping dangling tool calls", () => {
    const messages = [
      {
        id: "msg1",
        role: "assistant" as const,
        parts: [
          { type: "text", text: "I'll use a tool." },
          {
            type: "tool-call",
            toolCallId: "dangling_call_1",
            toolName: "some_tool",
            state: "input-available",
            args: {},
          },
        ],
      },
    ];

    const result = normalizeChatMessages(messages);

    // The message should remain because it still has the text part
    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(1);
    expect(result[0].parts![0]).toMatchObject({ type: "text" });
  });

  test("preserves distinct tool parts when toolCallIds differ", () => {
    const messages = [
      {
        id: "msg1",
        role: "assistant" as const,
        parts: [
          {
            type: "tool-archestra__create_agent",
            toolCallId: "call_create_1",
            state: "output-available",
            output: "created-1",
          },
          {
            type: "tool-archestra__create_agent",
            toolCallId: "call_create_2",
            state: "output-available",
            output: "created-2",
          },
        ],
      },
    ];

    const result = normalizeChatMessages(messages);

    expect(result[0].parts).toHaveLength(2);
  });
});
