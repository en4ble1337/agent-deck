import type { ThreadAction, ThreadState } from "../useThreadsReducer";

export function reduceThreadSnapshots(
  state: ThreadState,
  action: ThreadAction,
): ThreadState {
  switch (action.type) {
    case "setLastAgentMessage": {
      const existingLastMessage = state.lastAgentMessageByThread[action.threadId];
      if (
        existingLastMessage?.source === "agent" &&
        action.source !== "agent" &&
        existingLastMessage.timestamp >= action.timestamp
      ) {
        return state;
      }
      if (
        existingLastMessage?.timestamp > action.timestamp &&
        existingLastMessage?.source === action.source
      ) {
        return state;
      }
      if (
        existingLastMessage?.timestamp === action.timestamp &&
        existingLastMessage?.source === action.source &&
        existingLastMessage?.text === action.text
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
    }
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
