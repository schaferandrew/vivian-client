import { authenticatedFetch } from "@/lib/auth/client";
import type {
  BulkImportConfirmItem,
  BulkImportConfirmResponse,
  BulkImportResponse,
  Chat,
  ChatAttachmentInput,
  ChatListResponse,
  ChatMessageResponse,
  ChatWithMessages,
  CheckDuplicateResponse,
  ConfirmReceiptRequest,
  ConfirmReceiptResponse,
  ExpenseSchema,
  GenerateSummaryResponse,
  MCPEnabledUpdateResponse,
  MCPServersResponse,
  MCPTestAddResponse,
  ModelSelectResponse,
  ModelsResponse,
  ReceiptParseResponse,
  ReceiptUploadResponse,
  ReimbursementStatus,
  UnreimbursedBalanceResponse,
} from "@/types";

const DIRECT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000/api/v1";
const PROXY_API_URL = "/api/agent";

type ApiError = Error & {
  status?: number;
  data?: unknown;
  code?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMessageFromPayload(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return typeof payload === "string" && payload.trim() ? payload.trim() : null;
  }

  const candidate = [payload.error, payload.message, payload.detail].find(
    (value) => typeof value === "string" && value
  );

  return typeof candidate === "string" ? candidate : null;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  return text.trim() ? { message: text } : null;
}

function buildApiError(response: Response, payload: unknown): ApiError {
  const message =
    getMessageFromPayload(payload) ?? `API Error: ${response.status} ${response.statusText}`;
  const error = new Error(message) as ApiError;
  error.status = response.status;
  error.data = payload;
  return error;
}

function withJsonHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers ?? {});
  const body = init?.body;
  const hasBody = body !== undefined && body !== null;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return {
    ...init,
    headers,
  };
}

async function handleRequest<T>(
  url: string,
  init?: RequestInit,
  options?: { expectNoContent?: boolean }
): Promise<T> {
  const response = await authenticatedFetch(url, init);
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw buildApiError(response, payload);
  }

  if (options?.expectNoContent || response.status === 204 || payload === null) {
    return undefined as T;
  }

  return payload as T;
}

async function fetchDirectApi<T>(
  endpoint: string,
  init?: RequestInit,
  options?: { expectNoContent?: boolean }
): Promise<T> {
  return handleRequest<T>(
    `${DIRECT_API_URL}${endpoint}`,
    withJsonHeaders(init),
    options
  );
}

async function fetchProxyApi<T>(
  endpoint: string,
  init?: RequestInit,
  options?: { expectNoContent?: boolean }
): Promise<T> {
  return handleRequest<T>(
    `${PROXY_API_URL}${endpoint}`,
    withJsonHeaders(init),
    options
  );
}

// Create a new chat session
export async function createSession(): Promise<{ session_id: string; created_at: string }> {
  return fetchProxyApi("/chat/sessions", {
    method: "POST",
  });
}

// Simple chat message
export async function sendChatMessage(
  message: string,
  sessionId: string | null,
  chatId: string | null,
  webSearchEnabled: boolean = false,
  enabledMcpServers: string[] = [],
  attachments: ChatAttachmentInput[] = []
): Promise<ChatMessageResponse> {
  try {
    const payload: Record<string, unknown> = {
      message,
      session_id: sessionId,
      chat_id: chatId,
      web_search_enabled: webSearchEnabled,
      enabled_mcp_servers: enabledMcpServers,
    };
    if (attachments.length > 0) {
      payload.attachments = attachments;
    }

    return await fetchProxyApi<ChatMessageResponse>("/chat/message", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const apiError = error as ApiError;
    const payload = isRecord(apiError.data) ? apiError.data : {};

    if (apiError.status === 402 && (payload.error === "insufficient_credits" || payload.message)) {
      const msg =
        (typeof payload.message === "string" && payload.message) ||
        "Your account has insufficient credits. Add more credits and try again.";
      const enriched = new Error(msg) as ApiError;
      enriched.code = "insufficient_credits";
      throw enriched;
    }

    if (apiError.status === 429 && (payload.error === "rate_limit" || payload.message)) {
      const msg =
        (typeof payload.message === "string" && payload.message) ||
        "Rate limit exceeded. Please wait a moment and try again.";
      const enriched = new Error(msg) as ApiError;
      enriched.code = "rate_limit";
      throw enriched;
    }

    if (apiError.status === 404 && payload.error === "model_not_found") {
      const msg =
        (typeof payload.message === "string" && payload.message) ||
        "Model not found or unavailable.";
      const enriched = new Error(msg) as ApiError;
      enriched.code = "model_not_found";
      throw enriched;
    }

    throw error;
  }
}

// Upload receipt file
export async function uploadReceipt(file: File): Promise<ReceiptUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return handleRequest<ReceiptUploadResponse>(`${DIRECT_API_URL}/receipts/upload`, {
    method: "POST",
    body: formData,
  });
}

// Parse uploaded receipt
export async function parseReceipt(tempFilePath: string): Promise<ReceiptParseResponse> {
  return fetchDirectApi("/receipts/parse", {
    method: "POST",
    body: JSON.stringify({ temp_file_path: tempFilePath }),
  });
}

export async function checkReceiptDuplicate(
  expenseData: ExpenseSchema,
  fuzzyDays: number = 3
): Promise<CheckDuplicateResponse> {
  return fetchDirectApi("/receipts/check-duplicate", {
    method: "POST",
    body: JSON.stringify({
      expense_data: expenseData,
      fuzzy_days: fuzzyDays,
    }),
  });
}

// Confirm and save receipt
export async function confirmReceipt(
  data: ConfirmReceiptRequest
): Promise<ConfirmReceiptResponse> {
  return fetchDirectApi("/receipts/confirm", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Get unreimbursed balance
export async function getUnreimbursedBalance(): Promise<UnreimbursedBalanceResponse> {
  return fetchDirectApi("/ledger/balance/unreimbursed");
}

// Get available models
export async function getModels(): Promise<ModelsResponse> {
  return fetchProxyApi("/chat/models");
}

// Select a model
export async function selectModel(modelId: string): Promise<ModelSelectResponse> {
  return fetchProxyApi("/chat/models/select", {
    method: "POST",
    body: JSON.stringify({ model_id: modelId }),
  });
}

// Chat history API functions
export async function getChats(): Promise<ChatListResponse> {
  return fetchProxyApi("/chats");
}

export async function getChat(chatId: string): Promise<ChatWithMessages> {
  return fetchProxyApi(`/chats/${chatId}`);
}

export async function createChat(data?: { title?: string; model?: string }): Promise<Chat> {
  return fetchProxyApi("/chats", {
    method: "POST",
    body: JSON.stringify(data ?? { title: "New Chat" }),
  });
}

export async function deleteChat(chatId: string): Promise<void> {
  await fetchProxyApi<void>(
    `/chats/${chatId}`,
    {
      method: "DELETE",
    },
    { expectNoContent: true }
  );
}

export async function updateChatTitle(chatId: string, title: string): Promise<Chat> {
  return fetchProxyApi(`/chats/${chatId}/title`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function generateSummary(chatId: string): Promise<GenerateSummaryResponse> {
  return fetchProxyApi(`/chats/${chatId}/generate-summary`, {
    method: "POST",
  });
}

export async function getMcpServers(): Promise<MCPServersResponse> {
  return fetchProxyApi("/mcp/servers");
}

export async function updateEnabledMcpServers(
  enabledServerIds: string[]
): Promise<MCPEnabledUpdateResponse> {
  return fetchProxyApi("/mcp/servers", {
    method: "POST",
    body: JSON.stringify({ enabled_server_ids: enabledServerIds }),
  });
}

export async function runMcpAdditionTest(
  a: number,
  b: number,
  serverId = "test_addition"
): Promise<MCPTestAddResponse> {
  return fetchProxyApi("/mcp/test-add", {
    method: "POST",
    body: JSON.stringify({ a, b, server_id: serverId }),
  });
}

// Bulk Import API functions
export async function bulkImportScan(
  directoryPath: string,
  options?: {
    statusOverride?: ReimbursementStatus;
    skipErrors?: boolean;
    checkDuplicates?: boolean;
    duplicateAction?: "skip" | "flag" | "ask";
  }
): Promise<BulkImportResponse> {
  return fetchDirectApi("/receipts/bulk-import/scan", {
    method: "POST",
    body: JSON.stringify({
      directory_path: directoryPath,
      status_override: options?.statusOverride,
      skip_errors: options?.skipErrors ?? true,
      check_duplicates: options?.checkDuplicates ?? true,
      duplicate_action: options?.duplicateAction ?? "flag",
    }),
  });
}

export async function bulkImportScanTemp(
  tempFilePaths: string[],
  options?: {
    statusOverride?: ReimbursementStatus;
    skipErrors?: boolean;
    checkDuplicates?: boolean;
    duplicateAction?: "skip" | "flag" | "ask";
  }
): Promise<BulkImportResponse> {
  return fetchDirectApi("/receipts/bulk-import/scan-temp", {
    method: "POST",
    body: JSON.stringify({
      temp_file_paths: tempFilePaths,
      status_override: options?.statusOverride,
      skip_errors: options?.skipErrors ?? true,
      check_duplicates: options?.checkDuplicates ?? true,
      duplicate_action: options?.duplicateAction ?? "flag",
    }),
  });
}

export async function bulkImportConfirm(
  items: BulkImportConfirmItem[],
  statusOverride?: ReimbursementStatus,
  force: boolean = false
): Promise<BulkImportConfirmResponse> {
  return fetchDirectApi("/receipts/bulk-import/confirm", {
    method: "POST",
    body: JSON.stringify({
      items,
      status_override: statusOverride,
      force,
    }),
  });
}

// MCP Server Settings API
export async function getMcpServerSettings(
  serverId: string
): Promise<import("@/types").MCPServerSettingsResponse> {
  return fetchProxyApi(`/mcp/servers/${serverId}/settings`, {
    method: "GET",
  });
}

export async function updateMcpServerSettings(
  serverId: string,
  settings: Record<string, unknown>
): Promise<{ mcp_server_id: string; settings: Record<string, unknown> }> {
  return fetchProxyApi(`/mcp/servers/${serverId}/settings`, {
    method: "PUT",
    body: JSON.stringify({ settings }),
  });
}
