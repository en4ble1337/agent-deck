// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home } from "./Home";

afterEach(() => {
  cleanup();
});

const baseProps = {
  onOpenSettings: vi.fn(),
  onAddWorkspace: vi.fn(),
  onAddWorkspaceFromUrl: vi.fn(),
  onConnectRemoteWorkspace: vi.fn(),
  workspaces: [],
  threadsByWorkspace: {},
  threadStatusById: {},
  activeWorkspaceId: null,
  activeThreadId: null,
  latestAgentRuns: [],
  isLoadingLatestAgents: false,
  localUsageSnapshot: null,
  isLoadingLocalUsage: false,
  localUsageError: null,
  onRefreshLocalUsage: vi.fn(),
  usageMetric: "tokens" as const,
  onUsageMetricChange: vi.fn(),
  usageWorkspaceId: null,
  usageWorkspaceOptions: [],
  onUsageWorkspaceChange: vi.fn(),
  accountRateLimits: null,
  usageShowRemaining: false,
  accountInfo: null,
  onSelectThread: vi.fn(),
  onSendMessageToThread: vi.fn(),
};

function dispatchPaste(
  element: HTMLElement,
  items: Array<{ type: string; getAsFile: () => File | null }>,
  text = "",
) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: {
      getData: (type: string) => (type === "text/plain" ? text : ""),
      items,
    },
  });
  element.dispatchEvent(event);
}

function setMockFileReader() {
  const OriginalFileReader = window.FileReader;
  class MockFileReader {
    result: string | ArrayBuffer | null = null;
    onload: ((ev: ProgressEvent<FileReader>) => unknown) | null = null;
    onerror: ((ev: ProgressEvent<FileReader>) => unknown) | null = null;

    readAsDataURL(file: File) {
      this.result = `data:${file.type};base64,MOCK`;
      this.onload?.({} as ProgressEvent<FileReader>);
    }
  }
  window.FileReader = MockFileReader as typeof FileReader;
  return () => {
    window.FileReader = OriginalFileReader;
  };
}

describe("Home", () => {
  it("renders session tiles and lets you focus a real thread", () => {
    const onSelectThread = vi.fn();
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "AgentDeck",
            path: "/tmp/workspace-1",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            {
              id: "thread-1",
              name: "Dashboard refresh",
              updatedAt: Date.now(),
              createdAt: Date.now() - 120000,
              modelId: "gpt-5.2-codex",
            },
          ],
        }}
        threadStatusById={{ "thread-1": { isProcessing: true } }}
        latestAgentRuns={[
          {
            message: "Ship the dashboard refresh",
            timestamp: Date.now(),
            projectName: "AgentDeck",
            groupName: "Frontend",
            workspaceId: "workspace-1",
            threadId: "thread-1",
            isProcessing: true,
          },
        ]}
        onSelectThread={onSelectThread}
      />,
    );

    expect(screen.getByText("Terminal Mux")).toBeTruthy();
    const grid = screen.getByLabelText("Agent sessions");
    expect(within(grid).getByText("AgentDeck")).toBeTruthy();
    expect(within(grid).getByText("Dashboard refresh")).toBeTruthy();
    expect(within(grid).getByText("Ship the dashboard refresh")).toBeTruthy();
    fireEvent.click(within(grid).getByRole("button", { name: /Dashboard refresh/i }));
    expect(onSelectThread).toHaveBeenCalledWith("workspace-1", "thread-1");
    expect(screen.queryByText("Focused session")).toBeNull();
    expect(screen.getAllByText("Running").length).toBeGreaterThan(0);
  });

  it("does not echo a title-sized thread preview as the tile output", () => {
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "Cars Henry",
            path: "/tmp/cars-henry",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            {
              id: "thread-1",
              name: "hi",
              updatedAt: Date.now(),
              createdAt: Date.now() - 120000,
              modelId: "gpt-5.2-codex",
            },
          ],
        }}
        latestAgentRuns={[
          {
            message: "hi",
            source: "thread-preview",
            timestamp: Date.now(),
            projectName: "Cars Henry",
            groupName: null,
            workspaceId: "workspace-1",
            threadId: "thread-1",
            isProcessing: false,
          },
        ]}
      />,
    );

    expect(screen.getByText("No recent output loaded yet.")).toBeTruthy();
  });

  it("does not echo a truncated initial prompt as the tile output", () => {
    const prompt =
      "What happened that we see less tiles right now we have only two columns before we had three columns?";
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "AgentDeck",
            path: "/tmp/agent-deck",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            {
              id: "thread-1",
              name: "What happened that we see less tiles r...",
              updatedAt: Date.now(),
              createdAt: Date.now() - 120000,
              modelId: "gpt-5.2-codex",
            },
          ],
        }}
        latestAgentRuns={[
          {
            message: prompt,
            source: "thread-preview",
            timestamp: Date.now(),
            projectName: "AgentDeck",
            groupName: null,
            workspaceId: "workspace-1",
            threadId: "thread-1",
            isProcessing: false,
          },
        ]}
      />,
    );

    const grid = screen.getByLabelText("Agent sessions");
    expect(within(grid).getByText("No recent output loaded yet.")).toBeTruthy();
    expect(within(grid).queryByText(prompt)).toBeNull();
  });

  it("requests background output hydration for real tiles that only have the placeholder", () => {
    const onLoadSessionOutput = vi.fn();
    render(
      <Home
        {...baseProps}
        onLoadSessionOutput={onLoadSessionOutput}
        workspaces={[
          {
            id: "workspace-1",
            name: "AgentDeck",
            path: "/tmp/agent-deck",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            {
              id: "thread-1",
              name: "Tile preview hydration",
              updatedAt: Date.now(),
              createdAt: Date.now() - 120000,
              modelId: "gpt-5.2-codex",
            },
          ],
        }}
        latestAgentRuns={[
          {
            message: "Tile preview hydration",
            source: "thread-preview",
            timestamp: Date.now(),
            projectName: "AgentDeck",
            groupName: null,
            workspaceId: "workspace-1",
            threadId: "thread-1",
            isProcessing: false,
          },
        ]}
      />,
    );

    expect(onLoadSessionOutput).toHaveBeenCalledWith("workspace-1", "thread-1");
  });

  it("uses recent output as tile context when the thread title is generic", () => {
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "Codex Limits",
            path: "/tmp/codex-limits",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            {
              id: "thread-1",
              name: "hi",
              updatedAt: Date.now(),
              createdAt: Date.now() - 120000,
              modelId: "gpt-5.2-codex",
            },
          ],
        }}
        latestAgentRuns={[
          {
            message:
              "Absolutely. This repo is a lightweight Codex usage tracker so you can see your limits over time.",
            source: "agent",
            timestamp: Date.now(),
            projectName: "Codex Limits",
            groupName: null,
            workspaceId: "workspace-1",
            threadId: "thread-1",
            isProcessing: false,
          },
        ]}
      />,
    );

    expect(screen.getByText("This repo is a lightweight Codex usage tracker so you can see your...")).toBeTruthy();
  });

  it("uses the newest latest-agent entry when a session has multiple previews", () => {
    const now = Date.now();
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "Agent Deck",
            path: "/tmp/agent-deck",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            {
              id: "thread-1",
              name: "hi",
              updatedAt: now - 30000,
              createdAt: now - 120000,
              modelId: "gpt-5.2-codex",
            },
          ],
        }}
        latestAgentRuns={[
          {
            message: "Newest current answer",
            source: "agent",
            timestamp: now,
            projectName: "Agent Deck",
            groupName: null,
            workspaceId: "workspace-1",
            threadId: "thread-1",
            isProcessing: true,
          },
          {
            message: "Older stale answer",
            source: "agent",
            timestamp: now - 1000,
            projectName: "Agent Deck",
            groupName: null,
            workspaceId: "workspace-1",
            threadId: "thread-1",
            isProcessing: false,
          },
        ]}
      />,
    );

    expect(screen.getAllByText("Newest current answer").length).toBeGreaterThan(0);
    expect(screen.queryByText("Older stale answer")).toBeNull();
  });

  it("uses a newer thread-list preview when it is not just the title", () => {
    const now = Date.now();
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "AgentDeck",
            path: "/tmp/agent-deck",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            {
              id: "thread-1",
              name: "Tile layout follow-up",
              updatedAt: now,
              createdAt: now - 120000,
              modelId: "gpt-5.2-codex",
            },
          ],
        }}
        latestAgentRuns={[
          {
            message: "Raised the visible session cap and aged out idle sessions after one hour.",
            source: "thread-preview",
            timestamp: now,
            projectName: "AgentDeck",
            groupName: null,
            workspaceId: "workspace-1",
            threadId: "thread-1",
            isProcessing: false,
          },
        ]}
      />,
    );

    expect(
      screen.getByText("Raised the visible session cap and aged out idle sessions after one hour."),
    ).toBeTruthy();
  });

  it("filters session tiles from the dashboard counters", () => {
    const now = Date.now();
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "AgentDeck",
            path: "/tmp/workspace-1",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            {
              id: "running-thread",
              name: "Terminal mux",
              updatedAt: now,
              createdAt: now - 120000,
            },
            {
              id: "attention-thread",
              name: "Review queue",
              updatedAt: now - 1000,
              createdAt: now - 180000,
            },
          ],
        }}
        threadStatusById={{
          "running-thread": { isProcessing: true },
          "attention-thread": { hasUnread: true },
        }}
      />,
    );

    const grid = screen.getByLabelText("Agent sessions");
    expect(within(grid).getByText("Terminal mux")).toBeTruthy();
    expect(within(grid).getByText("Review queue")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /attention/i }));
    expect(within(grid).queryByText("Terminal mux")).toBeNull();
    expect(within(grid).getByText("Review queue")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /sessions/i }));
    expect(within(grid).getByText("Terminal mux")).toBeTruthy();
  });

  it("orders session tiles by latest activity and keeps a capped recent board", () => {
    const now = Date.now();
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "AgentDeck",
            path: "/tmp/workspace-1",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            ...Array.from({ length: 10 }, (_, index) => ({
              id: `idle-${index}`,
              name: `Idle ${index}`,
              updatedAt: now - index * 10,
              createdAt: now - 120000,
            })),
            {
              id: "stale-idle",
              name: "Stale idle",
              updatedAt: now - 7200000,
              createdAt: now - 10800000,
            },
            {
              id: "running",
              name: "Running work",
              updatedAt: now - 25,
              createdAt: now - 120000,
            },
            {
              id: "attention",
              name: "Needs response",
              updatedAt: now - 35,
              createdAt: now - 120000,
            },
          ],
        }}
        threadStatusById={{
          running: { isProcessing: true },
          attention: { hasUnread: true },
        }}
      />,
    );

    const grid = screen.getByLabelText("Agent sessions");
    const titles = Array.from(grid.querySelectorAll<HTMLElement>(".session-tile-title")).map(
      (element) => element.textContent,
    );

    expect(titles.slice(0, 6)).toEqual([
      "Idle 0",
      "Idle 1",
      "Idle 2",
      "Running work",
      "Idle 3",
      "Needs response",
    ]);
    expect(within(grid).getByText("Idle 0")).toBeTruthy();
    expect(within(grid).getByText("Idle 6")).toBeTruthy();
    expect(within(grid).queryByText("Idle 7")).toBeNull();
    expect(within(grid).queryByText("Stale idle")).toBeNull();
    expect(screen.getByRole("button", { name: /13sessions/i })).toBeTruthy();
  });

  it("caps the global session deck at nine tiles", () => {
    const now = Date.now();
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "AgentDeck",
            path: "/tmp/workspace-1",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
          {
            id: "workspace-2",
            name: "Cars Henry",
            path: "/tmp/workspace-2",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": Array.from({ length: 7 }, (_, index) => ({
            id: `ws1-${index}`,
            name: `Workspace 1 Session ${index}`,
            updatedAt: now - index,
            createdAt: now - 120000,
          })),
          "workspace-2": Array.from({ length: 7 }, (_, index) => ({
            id: `ws2-${index}`,
            name: `Workspace 2 Session ${index}`,
            updatedAt: now - 100 - index,
            createdAt: now - 120000,
          })),
        }}
      />,
    );

    const grid = screen.getByLabelText("Agent sessions");
    expect(grid.querySelectorAll(".session-tile").length).toBe(9);
    expect(screen.getByRole("button", { name: /14sessions/i })).toBeTruthy();
  });

  it("caps a workspace-filtered session deck at nine tiles", () => {
    const now = Date.now();
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "AgentDeck",
            path: "/tmp/workspace-1",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
          {
            id: "workspace-2",
            name: "Cars Henry",
            path: "/tmp/workspace-2",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": Array.from({ length: 12 }, (_, index) => ({
            id: `ws1-${index}`,
            name: `Workspace 1 Session ${index}`,
            updatedAt: now - index,
            createdAt: now - 120000,
          })),
          "workspace-2": [
            {
              id: "ws2-0",
              name: "Workspace 2 Session",
              updatedAt: now,
              createdAt: now - 120000,
            },
          ],
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Filter sessions by workspace"), {
      target: { value: "workspace-1" },
    });

    const grid = screen.getByLabelText("Agent sessions");
    expect(grid.querySelectorAll(".session-tile").length).toBe(9);
    expect(within(grid).queryByText("Workspace 2 Session")).toBeNull();
    expect(screen.getByRole("button", { name: /12sessions/i })).toBeTruthy();
  });

  it("does not keep an expired idle selected session on the main deck", () => {
    const now = Date.now();
    render(
      <Home
        {...baseProps}
        activeWorkspaceId="workspace-1"
        activeThreadId="expired-idle"
        workspaces={[
          {
            id: "workspace-1",
            name: "AgentDeck",
            path: "/tmp/workspace-1",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            ...Array.from({ length: 9 }, (_, index) => ({
              id: `recent-${index}`,
              name: `Recent ${index}`,
              updatedAt: now - index,
              createdAt: now - 120000,
            })),
            {
              id: "expired-idle",
              name: "Expired idle",
              updatedAt: now - 2 * 60 * 60 * 1000,
              createdAt: now - 3 * 60 * 60 * 1000,
            },
          ],
        }}
      />,
    );

    const grid = screen.getByLabelText("Agent sessions");
    expect(grid.querySelectorAll(".session-tile").length).toBe(9);
    expect(within(grid).queryByText("Expired idle")).toBeNull();
  });

  it("filters session tiles by workspace", () => {
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "Cars Henry",
            path: "/tmp/cars-henry",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
          {
            id: "workspace-2",
            name: "Openclaw",
            path: "/tmp/openclaw",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            {
              id: "thread-1",
              name: "Racing polish",
              updatedAt: Date.now(),
              createdAt: Date.now() - 120000,
              modelId: "gpt-5.2-codex",
            },
          ],
          "workspace-2": [
            {
              id: "thread-2",
              name: "Claw controls",
              updatedAt: Date.now() - 60000,
              createdAt: Date.now() - 240000,
              modelId: "gpt-5.2-codex",
            },
          ],
        }}
      />,
    );

    const grid = screen.getByLabelText("Agent sessions");
    expect(within(grid).getAllByText("Racing polish").length).toBeGreaterThan(0);
    expect(within(grid).getAllByText("Claw controls").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Filter sessions by workspace"), {
      target: { value: "workspace-1" },
    });

    expect(within(grid).getAllByText("Racing polish").length).toBeGreaterThan(0);
    expect(within(grid).queryByText("Claw controls")).toBeNull();
    expect(screen.getByRole("button", { name: /1sessions/i })).toBeTruthy();
  });

  it("sends a message directly from a real session tile", () => {
    const onSendMessageToThread = vi.fn().mockResolvedValue(undefined);
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "AgentDeck",
            path: "/tmp/workspace-1",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            {
              id: "thread-1",
              name: "Dashboard refresh",
              updatedAt: Date.now(),
              createdAt: Date.now() - 120000,
              modelId: "gpt-5.2-codex",
            },
          ],
        }}
        latestAgentRuns={[
          {
            message: "Latest useful reply",
            timestamp: Date.now(),
            projectName: "AgentDeck",
            groupName: null,
            workspaceId: "workspace-1",
            threadId: "thread-1",
            isProcessing: false,
          },
        ]}
        onSendMessageToThread={onSendMessageToThread}
      />,
    );

    const input = screen.getByLabelText("Message Dashboard refresh");
    fireEvent.change(input, { target: { value: "Can you continue?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSendMessageToThread).toHaveBeenCalledWith(
      "workspace-1",
      "thread-1",
      "Can you continue?",
      [],
    );
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("attaches pasted images to a tile message and sends them directly", async () => {
    const restoreFileReader = setMockFileReader();
    const onSendMessageToThread = vi.fn().mockResolvedValue(undefined);
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "AgentDeck",
            path: "/tmp/workspace-1",
            connected: true,
            settings: { sidebarCollapsed: false },
          },
        ]}
        threadsByWorkspace={{
          "workspace-1": [
            {
              id: "thread-1",
              name: "Dashboard refresh",
              updatedAt: Date.now(),
              createdAt: Date.now() - 120000,
              modelId: "gpt-5.2-codex",
            },
          ],
        }}
        latestAgentRuns={[
          {
            message: "Latest useful reply",
            timestamp: Date.now(),
            projectName: "AgentDeck",
            groupName: null,
            workspaceId: "workspace-1",
            threadId: "thread-1",
            isProcessing: false,
          },
        ]}
        onSendMessageToThread={onSendMessageToThread}
      />,
    );

    const input = screen.getByLabelText("Message Dashboard refresh");
    const image = new File(["data"], "paste.png", { type: "image/png" });
    const imageItem = { type: "image/png", getAsFile: () => image };

    await act(async () => {
      dispatchPaste(input, [imageItem]);
    });

    expect(screen.getByText("Pasted image")).toBeTruthy();
    const form = input.closest("form");
    if (!form) {
      throw new Error("Tile message form missing");
    }
    const sendButton = within(form).getByRole("button", { name: "Send" });
    fireEvent.click(sendButton);

    expect(onSendMessageToThread).toHaveBeenCalledWith(
      "workspace-1",
      "thread-1",
      "",
      ["data:image/png;base64,MOCK"],
    );
    expect(screen.queryByText("Pasted image")).toBeNull();
    restoreFileReader();
  });

  it("does not show stale fixture tiles when there are no workspaces", () => {
    render(<Home {...baseProps} />);

    const grid = screen.getByLabelText("Agent sessions");
    expect(within(grid).getByText("Add a workspace to start a session.")).toBeTruthy();
    expect(within(grid).queryByText("Terminal mux")).toBeNull();
    expect(within(grid).queryByText("Frontend checks")).toBeNull();
    expect(screen.getByRole("button", { name: /0sessions/i })).toBeTruthy();
    expect(screen.getByText("Workspaces")).toBeTruthy();
  });

  it("renders usage cards in time mode", () => {
    render(
      <Home
        {...baseProps}
        usageMetric="time"
        localUsageSnapshot={{
          updatedAt: Date.now(),
          days: [
            {
              day: "2026-01-20",
              inputTokens: 10,
              cachedInputTokens: 0,
              outputTokens: 5,
              totalTokens: 15,
              agentTimeMs: 120000,
              agentRuns: 2,
            },
          ],
          totals: {
            last7DaysTokens: 15,
            last30DaysTokens: 15,
            averageDailyTokens: 15,
            cacheHitRatePercent: 0,
            peakDay: "2026-01-20",
            peakDayTokens: 15,
          },
          topModels: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show usage snapshot" }));

    expect(screen.getAllByText("agent time").length).toBeGreaterThan(0);
    expect(screen.getByText("Runs")).toBeTruthy();
    expect(screen.getByText("Peak day")).toBeTruthy();
    expect(screen.getByText("Avg / run")).toBeTruthy();
    expect(screen.getByText("Avg / active day")).toBeTruthy();
    expect(screen.getByText("Longest streak")).toBeTruthy();
    expect(screen.getByText("Active days")).toBeTruthy();
  });

  it("renders expanded token stats and account limits", () => {
    render(
      <Home
        {...baseProps}
        localUsageSnapshot={{
          updatedAt: Date.now(),
          days: [
            {
              day: "2026-01-07",
              inputTokens: 20,
              cachedInputTokens: 5,
              outputTokens: 10,
              totalTokens: 30,
              agentTimeMs: 60000,
              agentRuns: 1,
            },
            {
              day: "2026-01-08",
              inputTokens: 10,
              cachedInputTokens: 0,
              outputTokens: 5,
              totalTokens: 15,
              agentTimeMs: 0,
              agentRuns: 0,
            },
            {
              day: "2026-01-09",
              inputTokens: 0,
              cachedInputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              agentTimeMs: 0,
              agentRuns: 0,
            },
            {
              day: "2026-01-10",
              inputTokens: 0,
              cachedInputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              agentTimeMs: 0,
              agentRuns: 0,
            },
            {
              day: "2026-01-11",
              inputTokens: 0,
              cachedInputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              agentTimeMs: 0,
              agentRuns: 0,
            },
            {
              day: "2026-01-12",
              inputTokens: 0,
              cachedInputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              agentTimeMs: 0,
              agentRuns: 0,
            },
            {
              day: "2026-01-13",
              inputTokens: 30,
              cachedInputTokens: 10,
              outputTokens: 20,
              totalTokens: 50,
              agentTimeMs: 120000,
              agentRuns: 2,
            },
            {
              day: "2026-01-14",
              inputTokens: 35,
              cachedInputTokens: 10,
              outputTokens: 15,
              totalTokens: 50,
              agentTimeMs: 120000,
              agentRuns: 2,
            },
            {
              day: "2026-01-15",
              inputTokens: 25,
              cachedInputTokens: 5,
              outputTokens: 15,
              totalTokens: 40,
              agentTimeMs: 120000,
              agentRuns: 2,
            },
            {
              day: "2026-01-16",
              inputTokens: 15,
              cachedInputTokens: 5,
              outputTokens: 10,
              totalTokens: 25,
              agentTimeMs: 60000,
              agentRuns: 1,
            },
            {
              day: "2026-01-17",
              inputTokens: 0,
              cachedInputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              agentTimeMs: 0,
              agentRuns: 0,
            },
            {
              day: "2026-01-18",
              inputTokens: 20,
              cachedInputTokens: 8,
              outputTokens: 12,
              totalTokens: 32,
              agentTimeMs: 90000,
              agentRuns: 1,
            },
            {
              day: "2026-01-19",
              inputTokens: 40,
              cachedInputTokens: 10,
              outputTokens: 25,
              totalTokens: 65,
              agentTimeMs: 180000,
              agentRuns: 3,
            },
            {
              day: "2026-01-20",
              inputTokens: 20,
              cachedInputTokens: 4,
              outputTokens: 16,
              totalTokens: 36,
              agentTimeMs: 120000,
              agentRuns: 2,
            },
          ],
          totals: {
            last7DaysTokens: 248,
            last30DaysTokens: 343,
            averageDailyTokens: 35,
            cacheHitRatePercent: 25,
            peakDay: "2026-01-19",
            peakDayTokens: 65,
          },
          topModels: [{ model: "gpt-5", tokens: 300, sharePercent: 87.5 }],
        }}
        accountRateLimits={{
          primary: {
            usedPercent: 62,
            windowDurationMins: 300,
            resetsAt: Math.round(Date.now() / 1000) + 3600,
          },
          secondary: {
            usedPercent: 34,
            windowDurationMins: 10080,
            resetsAt: Math.round(Date.now() / 1000) + 86400,
          },
          credits: {
            hasCredits: true,
            unlimited: true,
            balance: null,
          },
          planType: "pro",
        }}
        accountInfo={{
          type: "chatgpt",
          email: "user@example.com",
          planType: "pro",
          requiresOpenaiAuth: false,
        }}
      />,
    );

    expect(screen.queryByText("Cached tokens")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show usage snapshot" }));

    expect(screen.getByText("Cached tokens")).toBeTruthy();
    expect(screen.getByText("Avg / run")).toBeTruthy();
    expect(screen.getByText("Longest streak")).toBeTruthy();
    expect(screen.getByText("4 days")).toBeTruthy();
    expect(screen.getByText("Account limits")).toBeTruthy();
    expect(screen.getByText("Unlimited")).toBeTruthy();
    expect(screen.getByText("Pro")).toBeTruthy();
    expect(screen.getByText(/user@example\.com/)).toBeTruthy();
    expect(screen.queryByText("Workspace AgentDeck")).toBeNull();

    const todayCard = screen.getByText("Today").closest(".home-usage-card");
    expect(todayCard).toBeTruthy();
    if (!(todayCard instanceof HTMLElement)) {
      throw new Error("Expected today usage card");
    }
    expect(within(todayCard).getByText("36")).toBeTruthy();

    expect(
      screen.getByLabelText("Usage week 2026-01-14 to 2026-01-20"),
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Show next week" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      screen.getByText("Jan 20").closest(".home-usage-bar")?.getAttribute("data-value"),
    ).toBe("Jan 20 · 36 tokens");

    fireEvent.click(screen.getByRole("button", { name: "Show previous week" }));

    expect(
      screen.getByLabelText("Usage week 2026-01-07 to 2026-01-13"),
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Show next week" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Show next week" }));

    expect(
      screen.getByLabelText("Usage week 2026-01-14 to 2026-01-20"),
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Show next week" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("renders account limits even when no local usage snapshot exists", () => {
    render(
      <Home
        {...baseProps}
        accountRateLimits={{
          primary: {
            usedPercent: 62,
            windowDurationMins: 300,
            resetsAt: Math.round(Date.now() / 1000) + 3600,
          },
          secondary: null,
          credits: {
            hasCredits: true,
            unlimited: false,
            balance: "120",
          },
          planType: "pro",
        }}
        accountInfo={{
          type: "chatgpt",
          email: "user@example.com",
          planType: "pro",
          requiresOpenaiAuth: false,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show usage snapshot" }));

    expect(screen.getByText("Account limits")).toBeTruthy();
    expect(screen.getByText("120")).toBeTruthy();
    expect(screen.getByText(/user@example\.com/)).toBeTruthy();
    expect(screen.getByText("No usage data yet")).toBeTruthy();
  });
});
