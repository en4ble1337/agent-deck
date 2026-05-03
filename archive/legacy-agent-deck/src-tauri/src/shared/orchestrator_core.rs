use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

const DEFAULT_TIMEOUT: Duration = Duration::from_secs(120);
pub(crate) const CODEX_PROVIDER: &str = "codex";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OrchestratorConfig {
    pub(crate) provider: String,
    pub(crate) base_url: String,
    #[serde(default)]
    pub(crate) api_key: Option<String>,
    pub(crate) model: String,
    #[serde(default)]
    pub(crate) system_prompt: Option<String>,
    #[serde(default = "default_max_concurrent_agents")]
    pub(crate) max_concurrent_agents: u32,
}

fn default_max_concurrent_agents() -> u32 {
    3
}

impl Default for OrchestratorConfig {
    fn default() -> Self {
        Self {
            provider: "openai".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            api_key: None,
            model: "gpt-4o-mini".to_string(),
            system_prompt: None,
            max_concurrent_agents: default_max_concurrent_agents(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OrchestratorMessage {
    pub(crate) role: String,
    pub(crate) content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) tool_calls: Option<Vec<OrchestratorToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) tool_call_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OrchestratorToolCall {
    pub(crate) id: String,
    #[serde(rename = "type")]
    pub(crate) call_type: String,
    pub(crate) function: OrchestratorFunctionCall,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OrchestratorFunctionCall {
    pub(crate) name: String,
    pub(crate) arguments: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OrchestratorResponse {
    pub(crate) message: Option<OrchestratorMessage>,
    pub(crate) tool_calls: Vec<OrchestratorToolCall>,
    pub(crate) finish_reason: Option<String>,
    pub(crate) error: Option<String>,
}

fn build_tools_spec() -> Vec<Value> {
    vec![
        json!({
            "type": "function",
            "function": {
                "name": "spawn_agent",
                "description": "Start a new Codex agent thread in a workspace and send it a task. Returns a threadId to track progress.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "workspace_name": {
                            "type": "string",
                            "description": "Name of the workspace to spawn the agent in"
                        },
                        "task": {
                            "type": "string",
                            "description": "The task/prompt to send to the agent"
                        },
                        "access_mode": {
                            "type": "string",
                            "enum": ["read-only", "current", "full-access"],
                            "description": "Agent access mode. Defaults to 'current'."
                        }
                    },
                    "required": ["workspace_name", "task"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "check_agent_status",
                "description": "Check whether an agent thread is still processing or has completed.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "task_id": {
                            "type": "string",
                            "description": "The task ID returned by spawn_agent"
                        }
                    },
                    "required": ["task_id"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "send_followup",
                "description": "Send additional instructions to an existing agent thread.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "task_id": {
                            "type": "string",
                            "description": "The task ID of the running agent"
                        },
                        "message": {
                            "type": "string",
                            "description": "Follow-up message to send to the agent"
                        }
                    },
                    "required": ["task_id", "message"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "verify_git_changes",
                "description": "Check git status and diff of uncommitted changes in a workspace to verify agent work.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "workspace_name": {
                            "type": "string",
                            "description": "Name of the workspace to check git status for"
                        }
                    },
                    "required": ["workspace_name"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "list_workspaces",
                "description": "List all available workspaces that agents can be spawned in.",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "report_to_user",
                "description": "Send a status report or final summary back to the user.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "summary": {
                            "type": "string",
                            "description": "The summary or status report text"
                        },
                        "status": {
                            "type": "string",
                            "enum": ["progress", "completed", "failed"],
                            "description": "Overall status of the orchestration"
                        }
                    },
                    "required": ["summary", "status"]
                }
            }
        }),
    ]
}

pub(crate) fn is_codex_provider(provider: &str) -> bool {
    provider.eq_ignore_ascii_case(CODEX_PROVIDER)
        || provider.eq_ignore_ascii_case("codex_subscription")
        || provider.eq_ignore_ascii_case("chatgpt")
}

fn build_system_prompt(custom: Option<&str>) -> String {
    let base = r#"You are an orchestrator agent that coordinates multiple Codex coding agents across workspaces. Your job is to:

1. Break down the user's request into concrete tasks
2. Spawn agents in the right workspaces to execute those tasks
3. Monitor their progress and verify their work
4. Report back with results

Rules:
- Always call list_workspaces first to see available workspaces if you're unsure which workspace to target.
- Use spawn_agent to start tasks. Each call creates a separate agent thread.
- Use check_agent_status to monitor running agents. Wait for them to finish before spawning dependent tasks.
- Use verify_git_changes to verify work after an agent completes.
- Use report_to_user to communicate status and final results.
- Keep it concise. Don't over-explain.
- If a task fails, report the failure clearly with what went wrong."#;

    if let Some(custom_prompt) = custom {
        format!("{base}\n\nAdditional instructions:\n{custom_prompt}")
    } else {
        base.to_string()
    }
}

pub(crate) fn build_codex_orchestrator_prompt(
    config: &OrchestratorConfig,
    messages: &[Value],
) -> String {
    let system_prompt = build_system_prompt(config.system_prompt.as_deref());
    let tools = serde_json::to_string_pretty(&build_tools_spec()).unwrap_or_else(|_| "[]".into());
    let transcript = serde_json::to_string_pretty(messages).unwrap_or_else(|_| "[]".into());

    format!(
        r#"{system_prompt}

You are running inside a subscription-authenticated Codex runtime. AgentDeck will execute any tool calls you return.

Available tools, expressed as OpenAI-compatible function tool specs:
{tools}

Conversation so far, expressed as role/content/tool_call_id messages:
{transcript}

Return exactly one valid JSON object and no Markdown. The object must match this shape:
{{
  "message": {{ "role": "assistant", "content": "short text for the user, or empty while calling tools" }},
  "toolCalls": [
    {{
      "id": "call_unique_id",
      "type": "function",
      "function": {{ "name": "tool_name", "arguments": "{{}}" }}
    }}
  ],
  "finishReason": "tool_calls or stop",
  "error": null
}}

If you need AgentDeck to do anything, return one or more toolCalls. The function.arguments value must be a JSON string.
If you are done, return an empty toolCalls array and put the final answer in message.content.
"#
    )
}

fn strip_json_fence(raw: &str) -> &str {
    let trimmed = raw.trim();
    let Some(stripped) = trimmed.strip_prefix("```") else {
        return trimmed;
    };
    let without_lang = stripped
        .strip_prefix("json")
        .or_else(|| stripped.strip_prefix("JSON"))
        .unwrap_or(stripped)
        .trim_start();
    without_lang
        .strip_suffix("```")
        .map(str::trim)
        .unwrap_or(trimmed)
}

fn coerce_tool_call_ids(tool_calls: &mut [OrchestratorToolCall]) {
    for (index, tool_call) in tool_calls.iter_mut().enumerate() {
        if tool_call.id.trim().is_empty() {
            tool_call.id = format!("call_codex_{}", index + 1);
        }
        if tool_call.call_type.trim().is_empty() {
            tool_call.call_type = "function".to_string();
        }
    }
}

fn normalize_tool_calls_value(value: &mut Value) {
    let Some(calls) = value.as_array_mut() else {
        return;
    };
    for (index, call) in calls.iter_mut().enumerate() {
        let Some(call_obj) = call.as_object_mut() else {
            continue;
        };
        call_obj
            .entry("id")
            .or_insert_with(|| Value::String(format!("call_codex_{}", index + 1)));
        call_obj
            .entry("type")
            .or_insert_with(|| Value::String("function".to_string()));
        if let Some(function) = call_obj.get_mut("function").and_then(Value::as_object_mut) {
            if let Some(arguments) = function.get_mut("arguments") {
                if !arguments.is_string() {
                    let serialized =
                        serde_json::to_string(arguments).unwrap_or_else(|_| "{}".to_string());
                    *arguments = Value::String(serialized);
                }
            } else {
                function.insert("arguments".to_string(), Value::String("{}".to_string()));
            }
        }
    }
}

pub(crate) fn parse_codex_orchestrator_response(raw: &str) -> Result<OrchestratorResponse, String> {
    let cleaned = strip_json_fence(raw);
    let mut parsed: Value = serde_json::from_str(cleaned)
        .map_err(|err| format!("Codex orchestrator returned invalid JSON: {err}"))?;

    let tool_calls_value = if let Some(value) = parsed.get_mut("toolCalls") {
        value.take()
    } else if let Some(value) = parsed.get_mut("tool_calls") {
        value.take()
    } else {
        Value::Array(Vec::new())
    };

    let mut tool_calls_value = tool_calls_value;
    normalize_tool_calls_value(&mut tool_calls_value);
    let mut tool_calls: Vec<OrchestratorToolCall> = serde_json::from_value(tool_calls_value)
        .map_err(|err| format!("Codex orchestrator returned invalid toolCalls: {err}"))?;
    coerce_tool_call_ids(&mut tool_calls);

    let message_value = parsed
        .get_mut("message")
        .map(Value::take)
        .unwrap_or(Value::Null);
    let message = if message_value.is_null() {
        None
    } else if let Some(content) = message_value.as_str() {
        Some(OrchestratorMessage {
            role: "assistant".to_string(),
            content: content.to_string(),
            tool_calls: if tool_calls.is_empty() {
                None
            } else {
                Some(tool_calls.clone())
            },
            tool_call_id: None,
        })
    } else {
        let mut message: OrchestratorMessage = serde_json::from_value(message_value)
            .map_err(|err| format!("Codex orchestrator returned invalid message: {err}"))?;
        if message.role.trim().is_empty() {
            message.role = "assistant".to_string();
        }
        if !tool_calls.is_empty() && message.tool_calls.is_none() {
            message.tool_calls = Some(tool_calls.clone());
        }
        Some(message)
    };

    let finish_reason = parsed
        .get("finishReason")
        .or_else(|| parsed.get("finish_reason"))
        .and_then(Value::as_str)
        .map(String::from)
        .or_else(|| {
            Some(if tool_calls.is_empty() {
                "stop".to_string()
            } else {
                "tool_calls".to_string()
            })
        });

    let error = parsed
        .get("error")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(String::from);

    Ok(OrchestratorResponse {
        message,
        tool_calls,
        finish_reason,
        error,
    })
}

pub(crate) async fn send_orchestrator_chat(
    config: &OrchestratorConfig,
    messages: Vec<Value>,
) -> Result<OrchestratorResponse, String> {
    let api_key = config
        .api_key
        .as_deref()
        .filter(|key| !key.is_empty())
        .ok_or_else(|| "Orchestrator API key is not configured".to_string())?;

    let system_prompt = build_system_prompt(config.system_prompt.as_deref());
    let tools = build_tools_spec();

    let mut all_messages = vec![json!({
        "role": "system",
        "content": system_prompt
    })];
    all_messages.extend(messages);

    // Normalize base URL — strip /v1 suffix if we need to add /chat/completions
    let base = config.base_url.trim_end_matches('/');
    let endpoint = if base.ends_with("/chat/completions") {
        base.to_string()
    } else if base.ends_with("/v1") {
        format!("{base}/chat/completions")
    } else {
        format!("{base}/v1/chat/completions")
    };

    let payload = json!({
        "model": config.model,
        "messages": all_messages,
        "tools": tools,
        "tool_choice": "auto",
        "temperature": 0.2,
    });

    let client = Client::builder()
        .timeout(DEFAULT_TIMEOUT)
        .build()
        .map_err(|err| format!("Failed to create HTTP client: {err}"))?;

    let response = client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {api_key}"))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|err| format!("Orchestrator API request failed: {err}"))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|err| format!("Failed to read orchestrator response body: {err}"))?;

    if !status.is_success() {
        return Err(format!("Orchestrator API returned {status}: {body}"));
    }

    let parsed: Value =
        serde_json::from_str(&body).map_err(|err| format!("Failed to parse response: {err}"))?;

    let choices = parsed
        .get("choices")
        .and_then(Value::as_array)
        .ok_or_else(|| "No choices in orchestrator response".to_string())?;

    let first = choices
        .first()
        .ok_or_else(|| "Empty choices array in orchestrator response".to_string())?;

    let finish_reason = first
        .get("finish_reason")
        .and_then(Value::as_str)
        .map(String::from);

    let msg = first.get("message");

    let tool_calls: Vec<OrchestratorToolCall> = msg
        .and_then(|m| m.get("tool_calls"))
        .and_then(Value::as_array)
        .map(|arr| {
            arr.iter()
                .filter_map(|tc| serde_json::from_value(tc.clone()).ok())
                .collect()
        })
        .unwrap_or_default();

    let content = msg
        .and_then(|m| m.get("content"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    let message = if !content.is_empty() || !tool_calls.is_empty() {
        let message_tool_calls = if tool_calls.is_empty() {
            None
        } else {
            Some(tool_calls.clone())
        };
        Some(OrchestratorMessage {
            role: "assistant".to_string(),
            content,
            tool_calls: message_tool_calls,
            tool_call_id: None,
        })
    } else {
        None
    };

    Ok(OrchestratorResponse {
        message,
        tool_calls,
        finish_reason,
        error: None,
    })
}

#[cfg(test)]
mod tests {
    use super::{parse_codex_orchestrator_response, OrchestratorConfig};

    #[test]
    fn parses_codex_subscription_tool_call_response() {
        let raw = r#"{
          "message": { "role": "assistant", "content": "" },
          "toolCalls": [
            {
              "id": "",
              "type": "function",
              "function": {
                "name": "list_workspaces",
                "arguments": {}
              }
            }
          ],
          "finishReason": "tool_calls",
          "error": null
        }"#;

        let parsed = parse_codex_orchestrator_response(raw).expect("parse response");

        assert_eq!(parsed.tool_calls.len(), 1);
        assert_eq!(parsed.tool_calls[0].id, "call_codex_1");
        assert_eq!(parsed.tool_calls[0].function.name, "list_workspaces");
        assert_eq!(parsed.tool_calls[0].function.arguments, "{}");
        assert_eq!(parsed.finish_reason.as_deref(), Some("tool_calls"));
    }

    #[test]
    fn parses_codex_subscription_fenced_final_response() {
        let raw = r#"```json
{
  "message": "Done",
  "toolCalls": []
}
```"#;

        let parsed = parse_codex_orchestrator_response(raw).expect("parse response");

        assert!(parsed.tool_calls.is_empty());
        assert_eq!(
            parsed
                .message
                .as_ref()
                .map(|message| message.content.as_str()),
            Some("Done"),
        );
        assert_eq!(parsed.finish_reason.as_deref(), Some("stop"));
    }

    #[test]
    fn codex_config_default_remains_api_key_mode() {
        let config = OrchestratorConfig::default();
        assert_eq!(config.provider, "openai");
    }
}
