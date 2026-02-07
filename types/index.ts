// Reimbursement status enum matching backend
export type ReimbursementStatus = 
  | "reimbursed" 
  | "unreimbursed" 
  | "not_hsa_eligible";

// Core expense schema matching backend Pydantic model
export interface ExpenseSchema {
  provider: string;
  service_date?: string; // ISO date string
  paid_date?: string; // ISO date string
  amount: number;
  hsa_eligible: boolean;
  raw_model_output?: string;
}

// Parsed receipt from backend
export interface ParsedReceipt {
  expense: ExpenseSchema;
  confidence: number;
  parsing_errors: string[];
}

// Ledger entry from backend
export interface LedgerEntry {
  id: string;
  provider: string;
  service_date?: string;
  paid_date?: string;
  amount: number;
  hsa_eligible: boolean;
  status: ReimbursementStatus;
  reimbursement_date?: string;
  drive_file_id: string;
  confidence: number;
  created_at: string;
}

// API Response types
export interface ReceiptUploadResponse {
  temp_file_path: string;
  message: string;
}

export interface ReceiptParseResponse {
  parsed_data: ParsedReceipt;
  needs_review: boolean;
  temp_file_path: string;
}

export interface ConfirmReceiptRequest {
  temp_file_path: string;
  expense_data: ExpenseSchema;
  status: ReimbursementStatus;
  reimbursement_date?: string;
  notes?: string;
}

export interface ConfirmReceiptResponse {
  success: boolean;
  ledger_entry_id: string;
  drive_file_id: string;
  message: string;
}

export interface UnreimbursedBalanceResponse {
  total_amount: number;
  count: number;
}

// WebSocket message types matching backend protocol
export type MessageType = 
  | "handshake"
  | "handshake_response"
  | "text"
  | "agent_text"
  | "command"
  | "confirmation_request"
  | "action"
  | "typing"
  | "status"
  | "flow_event"
  | "file_upload"
  | "file_chunk"
  | "error";

export interface WebSocketMessage {
  type: MessageType;
  payload?: unknown;
  timestamp?: string;
}

export interface HandshakePayload {
  session_id?: string;
  client_info?: {
    platform: string;
    version: string;
  };
}

export interface HandshakeResponsePayload {
  session_id: string;
  server_version: string;
  message: string;
}

export interface TextPayload {
  content: string;
  message_id?: string;
}

export interface AgentTextPayload {
  content: string;
  message_id: string;
  is_streaming?: boolean;
  is_complete?: boolean;
}

export interface ConfirmationAction {
  id: string;
  label: string;
  style?: "primary" | "secondary" | "outline" | "destructive";
}

export interface ConfirmationRequestPayload {
  request_id: string;
  message: string;
  actions: ConfirmationAction[];
  context?: Record<string, unknown>;
}

export interface ActionPayload {
  request_id: string;
  action_id: string;
  data?: Record<string, unknown>;
}

export interface TypingPayload {
  is_typing: boolean;
  message?: string;
}

export interface FlowEventPayload {
  flow_id: string;
  flow_type: string;
  event: "started" | "step_changed" | "completed" | "error" | "paused";
  step?: string;
  data?: Record<string, unknown>;
  message?: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  recoverable: boolean;
  recovery_options?: string[];
  details?: Record<string, unknown>;
}

// Chat message for UI state
export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: Date;
  confirmationRequest?: ConfirmationRequestPayload;
  isStreaming?: boolean;
}

// Receipt upload state
export interface ReceiptUploadState {
  step: "upload" | "review" | "confirm" | "success";
  tempFilePath?: string;
  parsedData?: ParsedReceipt;
  isUploading: boolean;
  isParsing: boolean;
  error?: string;
}

// Model selection types
export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  selectable: boolean;
  free?: boolean;
}

export interface ProviderStatus {
  status: string;
  available?: boolean;
}

export interface ModelsResponse {
  models: LLMModel[];
  providers: Record<string, ProviderStatus>;
  current_model: string;
  default_model: string;
}

export interface ModelSelectResponse {
  success: boolean;
  selected_model: string;
}
