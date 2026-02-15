import { z } from "zod";

const primitiveFilterValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const mcpColumnFilterOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "starts_with",
  "ends_with",
  "in",
  "gt",
  "gte",
  "lt",
  "lte",
]);

export const mcpColumnFilterSchema = z.object({
  column: z.string().min(1),
  operator: mcpColumnFilterOperatorSchema.default("equals"),
  value: z.union([primitiveFilterValueSchema, z.array(primitiveFilterValueSchema)]),
  case_sensitive: z.boolean().optional(),
});

export const mcpServerSettingsSchemaSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "folder_id", "spreadsheet_id", "text"]),
  required: z.boolean(),
  default: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

export const mcpServerInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  tools: z.array(z.string()),
  default_enabled: z.boolean(),
  enabled: z.boolean(),
  source: z.string(),
  requires_connection: z.string().nullable(),
  settings_schema: z.array(mcpServerSettingsSchemaSchema).nullable(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  editable: z.boolean(),
});

export const mcpServersResponseSchema = z.object({
  servers: z.array(mcpServerInfoSchema),
  enabled_server_ids: z.array(z.string()),
});

export const mcpEnabledUpdateResponseSchema = z.object({
  enabled_server_ids: z.array(z.string()),
});

export const mcpServerSettingsResponseSchema = z.object({
  mcp_server_id: z.string().min(1),
  settings: z.record(z.string(), z.unknown()),
  settings_schema: z.array(mcpServerSettingsSchemaSchema),
  editable: z.boolean(),
});

export const mcpServerSettingsUpdateResponseSchema = z.object({
  mcp_server_id: z.string().min(1),
  settings: z.record(z.string(), z.unknown()),
});

export type MCPColumnFilter = z.infer<typeof mcpColumnFilterSchema>;
