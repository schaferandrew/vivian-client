import { act } from "react";
import { useChatStore } from "@/lib/stores/chat";

describe("chat store", () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useChatStore.setState({
        messages: [],
        chats: [],
        currentChatId: null,
        sessionId: null,
        isLoading: false,
        sidebarCollapsed: false,
        webSearchEnabled: false,
        mcpServers: [],
        completedWorkflowIds: [],
      });
    });
  });

  describe("addMessage", () => {
    it("appends a message to the list", () => {
      act(() => {
        useChatStore.getState().addMessage({
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: new Date("2026-01-01"),
        });
      });

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe("Hello");
    });

    it("preserves existing messages when adding", () => {
      act(() => {
        useChatStore.getState().addMessage({
          id: "msg-1",
          role: "user",
          content: "First",
          timestamp: new Date("2026-01-01"),
        });
      });

      act(() => {
        useChatStore.getState().addMessage({
          id: "msg-2",
          role: "agent",
          content: "Second",
          timestamp: new Date("2026-01-01"),
        });
      });

      expect(useChatStore.getState().messages).toHaveLength(2);
    });
  });

  describe("clearMessages", () => {
    it("clears all messages", () => {
      act(() => {
        useChatStore.getState().addMessage({
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: new Date("2026-01-01"),
        });
      });

      act(() => {
        useChatStore.getState().clearMessages();
      });

      expect(useChatStore.getState().messages).toHaveLength(0);
    });
  });

  describe("workflow completion tracking", () => {
    it("marks a workflow as completed", () => {
      act(() => {
        useChatStore.getState().markWorkflowCompleted("wf_abc123");
      });

      const state = useChatStore.getState();
      expect(state.completedWorkflowIds).toContain("wf_abc123");
      expect(state.isWorkflowCompleted("wf_abc123")).toBe(true);
    });

    it("does not duplicate completed workflow IDs", () => {
      act(() => {
        useChatStore.getState().markWorkflowCompleted("wf_abc123");
      });

      act(() => {
        useChatStore.getState().markWorkflowCompleted("wf_abc123");
      });

      const state = useChatStore.getState();
      expect(state.completedWorkflowIds.filter((id: string) => id === "wf_abc123")).toHaveLength(1);
    });

    it("tracks multiple completed workflows", () => {
      act(() => {
        useChatStore.getState().markWorkflowCompleted("wf_1");
      });

      act(() => {
        useChatStore.getState().markWorkflowCompleted("wf_2");
      });

      const state = useChatStore.getState();
      expect(state.completedWorkflowIds).toHaveLength(2);
      expect(state.isWorkflowCompleted("wf_1")).toBe(true);
      expect(state.isWorkflowCompleted("wf_2")).toBe(true);
      expect(state.isWorkflowCompleted("wf_3")).toBe(false);
    });
  });

  describe("MCP server state", () => {
    it("sets MCP servers", () => {
      act(() => {
        useChatStore.getState().setMcpServers([
          {
            id: "hsa_ledger",
            name: "HSA Ledger",
            description: "HSA tools",
            tools: ["add_numbers"],
            default_enabled: true,
            enabled: true,
            source: "builtin",
            settings_schema: [],
            settings: {},
            editable: false,
          },
        ]);
      });

      expect(useChatStore.getState().mcpServers).toHaveLength(1);
      expect(useChatStore.getState().mcpServers[0].id).toBe("hsa_ledger");
    });

    it("toggles MCP server enabled state", () => {
      act(() => {
        useChatStore.getState().setMcpServers([
          {
            id: "hsa_ledger",
            name: "HSA Ledger",
            description: "HSA tools",
            tools: [],
            default_enabled: true,
            enabled: true,
            source: "builtin",
            settings_schema: [],
            settings: {},
            editable: false,
          },
        ]);
      });

      act(() => {
        useChatStore.getState().setMcpServerEnabled("hsa_ledger", false);
      });

      expect(useChatStore.getState().mcpServers[0].enabled).toBe(false);
    });
  });

  describe("sidebar state", () => {
    it("toggles sidebar collapsed state", () => {
      expect(useChatStore.getState().sidebarCollapsed).toBe(false);

      act(() => {
        useChatStore.getState().toggleSidebar();
      });

      expect(useChatStore.getState().sidebarCollapsed).toBe(true);

      act(() => {
        useChatStore.getState().toggleSidebar();
      });

      expect(useChatStore.getState().sidebarCollapsed).toBe(false);
    });
  });
});
