// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home } from "./Home";

afterEach(() => {
  cleanup();
});

const baseProps = {
  onOpenSettings: vi.fn(),
  onAddWorkspace: vi.fn(),
  onAddWorkspaceFromUrl: vi.fn(),
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

describe("Home", () => {
  it("renders session tiles and lets you focus a real thread", () => {
    const onSelectThread = vi.fn();
    render(
      <Home
        {...baseProps}
        workspaces={[
          {
            id: "workspace-1",
            name: "CodexMonitor",
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
            projectName: "CodexMonitor",
            groupName: "Frontend",
            workspaceId: "workspace-1",
            threadId: "thread-1",
            isProcessing: true,
          },
        ]}
        onSelectThread={onSelectThread}
      />,
    );

    expect(screen.getByText("Agent Deck")).toBeTruthy();
    const grid = screen.getByLabelText("Agent sessions");
    expect(within(grid).getByText("CodexMonitor")).toBeTruthy();
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

  it("filters session tiles from the dashboard counters", () => {
    render(<Home {...baseProps} />);

    const grid = screen.getByLabelText("Agent sessions");
    expect(within(grid).getByText("Codex Monitor foundation")).toBeTruthy();
    expect(within(grid).getByText("Review surface")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /attention/i }));
    expect(within(grid).queryByText("Codex Monitor foundation")).toBeNull();
    expect(within(grid).getByText("Review surface")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /sessions/i }));
    expect(within(grid).getByText("Codex Monitor foundation")).toBeTruthy();
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
            name: "CodexMonitor",
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
            projectName: "CodexMonitor",
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
    );
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("shows first-run fixture tiles when there are no sessions", () => {
    render(<Home {...baseProps} />);

    const grid = screen.getByLabelText("Agent sessions");
    expect(within(grid).getByText("Codex Monitor foundation")).toBeTruthy();
    expect(within(grid).getByText("AGX tile model")).toBeTruthy();
    expect(screen.getByText("Session deck")).toBeTruthy();
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
    expect(screen.queryByText("Workspace CodexMonitor")).toBeNull();

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
