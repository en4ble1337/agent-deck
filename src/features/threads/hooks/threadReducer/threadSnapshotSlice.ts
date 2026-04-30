import type { ThreadAction, ThreadState } from "../useThreadsReducer";

export function reduceThreadSnapshots(
  state: ThreadState,
  action: ThreadAction,
): ThreadState {
  switch (action.type) {
    case "setLastAgentMessage":
      if (
        state.lastAgentMessageByThread[action.threadId]?.source === "agent" &&
        action.source !== "agent"
      ) {
        return state;
      }
      if (
        state.lastAgentMessageByThread[action.threadId]?.timestamp >=
          action.timestamp &&
        state.lastAgentMessageByThread[action.threadId]?.source === action.source
      ) {
        return state;
      }
      return {
        ...state,
        lastAgentMessageByThread: {
          ...state.lastAgentMessageByThread,
          [action.threadId]: {
            text: action.text,
            timestamp: action.timestamp,
            source: action.source,
          },
        },
      };
    case "setThreadTokenUsage":
      return {
        ...state,
        tokenUsageByThread: {
          ...state.tokenUsageByThread,
          [action.threadId]: action.tokenUsage,
        },
      };
    case "setRateLimits":
      return {
        ...state,
        rateLimitsByWorkspace: {
          ...state.rateLimitsByWorkspace,
          [action.workspaceId]: action.rateLimits,
        },
      };
    case "setAccountInfo":
      return {
        ...state,
        accountByWorkspace: {
          ...state.accountByWorkspace,
          [action.workspaceId]: action.account,
        },
      };
    case "setThreadTurnDiff":
      return {
        ...state,
        turnDiffByThread: {
          ...state.turnDiffByThread,
          [action.threadId]: action.diff,
        },
      };
    case "setThreadPlan":
      return {
        ...state,
        planByThread: {
          ...state.planByThread,
          [action.threadId]: action.plan,
        },
      };
    case "clearThreadPlan":
      return {
        ...state,
        planByThread: {
          ...state.planByThread,
          [action.threadId]: null,
        },
      };
    default:
      return state;
  }
}
