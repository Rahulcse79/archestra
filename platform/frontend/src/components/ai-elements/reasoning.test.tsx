import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./reasoning";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderReasoning(props: React.ComponentProps<typeof Reasoning> = {}) {
  return render(
    <Reasoning {...props}>
      <ReasoningTrigger />
      <ReasoningContent>Inner reasoning text</ReasoningContent>
    </Reasoning>,
  );
}

// ---------------------------------------------------------------------------
// ReasoningTrigger label state
// ---------------------------------------------------------------------------

describe("ReasoningTrigger label", () => {
  it('shows "Thinking..." while a block is actively streaming', () => {
    renderReasoning({ isStreaming: true });
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it('shows "Thought for a few seconds" when not streaming and duration is 0', () => {
    renderReasoning({ isStreaming: false, duration: 0 });
    expect(screen.getByText("Thought for a few seconds")).toBeInTheDocument();
  });

  it('shows "Thought for a few seconds" when not streaming and no duration prop', () => {
    renderReasoning({ isStreaming: false });
    expect(screen.getByText("Thought for a few seconds")).toBeInTheDocument();
  });

  it("shows exact duration when not streaming and duration > 0", () => {
    renderReasoning({ isStreaming: false, duration: 5 });
    expect(screen.getByText("Thought for 5 seconds")).toBeInTheDocument();
  });

  it('switches label from "Thinking..." to duration text when streaming ends', async () => {
    vi.useFakeTimers();

    const { rerender } = renderReasoning({ isStreaming: true, duration: 0 });
    expect(screen.getByText("Thinking...")).toBeInTheDocument();

    rerender(
      <Reasoning isStreaming={false} duration={3}>
        <ReasoningTrigger />
        <ReasoningContent>Inner reasoning text</ReasoningContent>
      </Reasoning>,
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText("Thought for 3 seconds")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows "Thought for a few seconds" after refresh (duration=0, not streaming) — regression for #4353', () => {
    // Simulates a page reload where isStreaming=false and duration=0 (no timer ran)
    renderReasoning({ isStreaming: false, duration: 0 });
    expect(screen.getByText("Thought for a few seconds")).toBeInTheDocument();
    expect(screen.queryByText("Thinking...")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

describe("Reasoning layout", () => {
  it("applies my-4 margin class (symmetric vertical spacing)", () => {
    const { container } = renderReasoning();
    const collapsible = container.firstChild as HTMLElement;
    expect(collapsible.className).toContain("my-4");
  });

  it("does NOT apply mb-4-only class", () => {
    const { container } = renderReasoning();
    const collapsible = container.firstChild as HTMLElement;
    // mb-4 without mt-4 would be asymmetric — this guards the reviewer fix
    expect(collapsible.className).not.toMatch(/\bmb-4\b/);
  });

  it("merges extra className onto the collapsible root", () => {
    const { container } = renderReasoning({ className: "w-full" });
    const collapsible = container.firstChild as HTMLElement;
    expect(collapsible.className).toContain("w-full");
  });
});

// ---------------------------------------------------------------------------
// Open / close behaviour
// ---------------------------------------------------------------------------

describe("Reasoning open/close behaviour", () => {
  it("is open by default", () => {
    renderReasoning();
    expect(screen.getByText("Inner reasoning text")).toBeVisible();
  });

  it("starts closed when defaultOpen=false", () => {
    const { container } = renderReasoning({ defaultOpen: false });
    // Radix Collapsible sets data-state on the root element
    expect(container.firstChild).toHaveAttribute("data-state", "closed");
  });

  it("auto-closes after streaming ends (with delay)", () => {
    vi.useFakeTimers();

    const { container, rerender } = renderReasoning({ isStreaming: true });
    const collapsible = container.firstChild as HTMLElement;

    // Still open while streaming
    expect(collapsible).toHaveAttribute("data-state", "open");

    rerender(
      <Reasoning isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>Inner reasoning text</ReasoningContent>
      </Reasoning>,
    );

    act(() => {
      vi.runAllTimers();
    });

    // After auto-close the collapsible root should be closed
    expect(collapsible).toHaveAttribute("data-state", "closed");

    vi.useRealTimers();
  });

  it("reopens on user click after auto-closing", () => {
    vi.useFakeTimers();

    const { container, rerender } = renderReasoning({ isStreaming: true });
    const collapsible = container.firstChild as HTMLElement;

    rerender(
      <Reasoning isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>Inner reasoning text</ReasoningContent>
      </Reasoning>,
    );

    act(() => { vi.runAllTimers(); });

    // Closed after auto-close
    expect(collapsible).toHaveAttribute("data-state", "closed");

    // User clicks trigger to reopen
    act(() => { fireEvent.click(screen.getByRole("button")); });

    expect(collapsible).toHaveAttribute("data-state", "open");

    vi.useRealTimers();
  });

  it("auto-closes only once and stays user-opened afterwards", () => {
    vi.useFakeTimers();

    const { container, rerender } = renderReasoning({ isStreaming: true });
    const collapsible = container.firstChild as HTMLElement;

    rerender(
      <Reasoning isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>Inner reasoning text</ReasoningContent>
      </Reasoning>,
    );

    act(() => { vi.runAllTimers(); });

    // Reopen manually via click
    act(() => { fireEvent.click(screen.getByRole("button")); });
    expect(collapsible).toHaveAttribute("data-state", "open");

    // Second re-render without streaming should NOT auto-close again
    rerender(
      <Reasoning isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>Inner reasoning text</ReasoningContent>
      </Reasoning>,
    );

    act(() => { vi.runAllTimers(); });

    // Should remain open — auto-close only fires once
    expect(collapsible).toHaveAttribute("data-state", "open");

    vi.useRealTimers();
  });
});
