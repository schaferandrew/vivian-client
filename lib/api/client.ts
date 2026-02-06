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

// Simple chat message - returns agent response
export async function sendChatMessage(message: string): Promise<{ response: string; session_id?: string }> {
  return fetchApi("/chat/message", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
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

// Get available models
export async function getModels(): Promise<import("@/types").ModelsResponse> {
  return fetchApi("/chat/models");
}

// Select a model
export async function selectModel(modelId: string): Promise<import("@/types").ModelSelectResponse> {
  return fetchApi("/chat/models/select", {
    method: "POST",
    body: JSON.stringify({ model_id: modelId }),
  });
}
