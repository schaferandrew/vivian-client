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
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Simple chat message - returns agent response (via same-origin proxy so it works regardless of how you open the app)
export async function sendChatMessage(message: string): Promise<{ response: string; session_id?: string }> {
  const res = await fetch("/api/agent/chat/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
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
  return fetchApi("/receipts/confirm", {
    method: "POST",
    body: JSON.stringify(data),
  });
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
