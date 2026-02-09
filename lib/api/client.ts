// API Configuration
const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000/api/v1";

// Helper for making API requests
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null) as {
      detail?: string;
      error?: string;
      message?: string;
    } | null;
    const errorText = await response.text().catch(() => "");
    const detail =
      errorJson?.detail ||
      errorJson?.error ||
      errorJson?.message ||
      errorText ||
      `Request failed (${response.status})`;
    throw new Error(detail);
  }

  return response.json();
}

// Create a new chat session
export async function createSession(): Promise<{ session_id: string; created_at: string }> {
  const res = await fetch(`${API_URL}/chat/sessions`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Failed to create session");
  }
  return res.json();
}

// Simple chat message - returns agent response (via same-origin proxy so it works regardless of how you open the app)
export async function sendChatMessage(
  message: string,
  sessionId: string | null,
  chatId: string | null,
  webSearchEnabled: boolean = false,
  enabledMcpServers: string[] = []
): Promise<import("@/types").ChatMessageResponse> {
  const res = await fetch("/api/agent/chat/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      chat_id: chatId,
      web_search_enabled: webSearchEnabled,
      enabled_mcp_servers: enabledMcpServers,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; message?: string; detail?: string };
    if (res.status === 402 && (err?.error === "insufficient_credits" || err?.message)) {
      const msg = err.message ?? "Your account has insufficient credits. Add more credits and try again.";
      const e = new Error(msg) as Error & { code?: string };
      e.code = "insufficient_credits";
      throw e;
    }
    if (res.status === 429 && (err?.error === "rate_limit" || err?.message)) {
      const msg = err.message ?? "Rate limit exceeded. Please wait a moment and try again.";
      const e = new Error(msg) as Error & { code?: string };
      e.code = "rate_limit";
      throw e;
    }
    if (res.status === 404 && err?.error === "model_not_found") {
      const msg = err.message ?? "Model not found or unavailable.";
      const e = new Error(msg) as Error & { code?: string };
      e.code = "model_not_found";
      throw e;
    }
    throw new Error(err?.error ?? err?.detail ?? err?.message ?? `API Error: ${res.status}`);
  }
  return res.json();
}

// Upload receipt file
export async function uploadReceipt(file: File): Promise<import("@/types").ReceiptUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/receipts/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${error}`);
  }

  return response.json();
}

// Parse uploaded receipt
export async function parseReceipt(tempFilePath: string): Promise<import("@/types").ReceiptParseResponse> {
  return fetchApi("/receipts/parse", {
    method: "POST",
    body: JSON.stringify({ temp_file_path: tempFilePath }),
  });
}

// Confirm and save receipt
export async function confirmReceipt(
  data: import("@/types").ConfirmReceiptRequest
): Promise<import("@/types").ConfirmReceiptResponse> {
  const response = await fetch(`${API_URL}/receipts/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const payload = (await response.json().catch(() => ({}))) as import("@/types").ConfirmReceiptResponse & {
    detail?: string;
    error?: string;
  };
  if (!response.ok) {
    const error = new Error(
      payload.message ||
      payload.detail ||
      payload.error ||
      `Request failed (${response.status})`
    ) as Error & {
      drive_upload_success?: boolean;
      ledger_update_success?: boolean;
    };
    error.drive_upload_success = payload.drive_upload_success;
    error.ledger_update_success = payload.ledger_update_success;
    throw error;
  }

  return payload;
}

// Get unreimbursed balance
export async function getUnreimbursedBalance(): Promise<import("@/types").UnreimbursedBalanceResponse> {
  return fetchApi("/ledger/balance/unreimbursed");
}

// Get available models (via same-origin proxy so model list and selection work like chat)
export async function getModels(): Promise<import("@/types").ModelsResponse> {
  const res = await fetch("/api/agent/chat/models");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? err?.detail ?? `API Error: ${res.status}`);
  }
  return res.json();
}

// Select a model (via same-origin proxy so the backend that serves chat uses this selection)
export async function selectModel(modelId: string): Promise<import("@/types").ModelSelectResponse> {
  const res = await fetch("/api/agent/chat/models/select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model_id: modelId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? err?.detail ?? `API Error: ${res.status}`);
  }
  return res.json();
}

// Chat history API functions
export async function getChats(): Promise<import("@/types").ChatListResponse> {
  return fetchApi("/chats/");
}

export async function getChat(chatId: string): Promise<import("@/types").ChatWithMessages> {
  return fetchApi(`/chats/${chatId}/`);
}

export async function createChat(data?: { title?: string; model?: string }): Promise<import("@/types").Chat> {
  return fetchApi("/chats/", {
    method: "POST",
    body: JSON.stringify(data ?? { title: "New Chat" }),
  });
}

export async function deleteChat(chatId: string): Promise<void> {
  await fetchApi(`/chats/${chatId}/`, {
    method: "DELETE",
  });
}

export async function updateChatTitle(chatId: string, title: string): Promise<import("@/types").Chat> {
  return fetchApi(`/chats/${chatId}/title`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function generateSummary(chatId: string): Promise<import("@/types").GenerateSummaryResponse> {
  return fetchApi(`/chats/${chatId}/generate-summary`, {
    method: "POST",
  });
}

export async function getMcpServers(): Promise<import("@/types").MCPServersResponse> {
  const res = await fetch("/api/agent/mcp/servers", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? err?.detail ?? `API Error: ${res.status}`);
  }
  return res.json();
}

export async function updateEnabledMcpServers(
  enabledServerIds: string[]
): Promise<import("@/types").MCPEnabledUpdateResponse> {
  const res = await fetch("/api/agent/mcp/servers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled_server_ids: enabledServerIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? err?.detail ?? `API Error: ${res.status}`);
  }
  return res.json();
}

export async function runMcpAdditionTest(
  a: number,
  b: number,
  serverId = "test_addition"
): Promise<import("@/types").MCPTestAddResponse> {
  const res = await fetch("/api/agent/mcp/test-add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ a, b, server_id: serverId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? err?.detail ?? `API Error: ${res.status}`);
  }
  return res.json();
}
