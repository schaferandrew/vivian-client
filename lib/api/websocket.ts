"use client";

import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/lib/stores/chat";
import type {
  WebSocketMessage,
  HandshakePayload,
  TextPayload,
  ActionPayload,
} from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_AGENT_WS_URL || "ws://localhost:8000/api/v1/chat/ws";

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const {
    sessionId,
    setSessionId,
    setConnected,
    setConnecting,
    addMessage,
    setTyping,
    updateStreamingMessage,
    completeStreamingMessage,
    setConfirmationRequest,
    clearConfirmationRequest,
  } = useChatStore();

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    setConnecting(true);

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log("WebSocket connected");
        setConnected(true);
        setConnecting(false);

        // Send handshake
        const handshake: WebSocketMessage = {
          type: "handshake",
          payload: {
            session_id: sessionId,
            client_info: {
              platform: "web",
              version: "1.0.0",
            },
          } as HandshakePayload,
        };
        ws.current?.send(JSON.stringify(handshake));
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.current.onclose = () => {
        console.log("WebSocket disconnected");
        setConnected(false);
        setConnecting(false);

        // Attempt to reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnected(false);
        setConnecting(false);
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      setConnecting(false);
    }
  }, [sessionId, setSessionId, setConnected, setConnecting]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    ws.current?.close();
    ws.current = null;
  }, []);

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case "handshake_response":
          if (message.payload && typeof message.payload === "object") {
            const payload = message.payload as { session_id: string };
            setSessionId(payload.session_id);
          }
          break;

        case "agent_text":
          if (message.payload && typeof message.payload === "object") {
            const payload = message.payload as {
              content: string;
              message_id: string;
              is_streaming?: boolean;
              is_complete?: boolean;
            };

            if (payload.is_streaming) {
              if (payload.is_complete) {
                completeStreamingMessage(payload.message_id);
              } else {
                updateStreamingMessage(payload.message_id, payload.content);
              }
            } else {
              addMessage({
                id: payload.message_id || Date.now().toString(),
                role: "agent",
                content: payload.content,
                timestamp: new Date(),
              });
            }
          }
          break;

        case "typing":
          if (message.payload && typeof message.payload === "object") {
            const payload = message.payload as { is_typing: boolean };
            setTyping(payload.is_typing);
          }
          break;

        case "confirmation_request":
          if (message.payload && typeof message.payload === "object") {
            setConfirmationRequest(message.payload as import("@/types").ConfirmationRequestPayload);
          }
          break;

        case "flow_event":
          // Handle flow events (progress updates)
          console.log("Flow event:", message.payload);
          break;

        case "error":
          if (message.payload && typeof message.payload === "object") {
            const payload = message.payload as { message: string };
            addMessage({
              id: Date.now().toString(),
              role: "system",
              content: `Error: ${payload.message}`,
              timestamp: new Date(),
            });
          }
          break;
      }
    },
    [addMessage, setTyping, updateStreamingMessage, completeStreamingMessage, setConfirmationRequest, setSessionId]
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (ws.current?.readyState !== WebSocket.OPEN) {
        console.error("WebSocket not connected");
        return;
      }

      const message: WebSocketMessage = {
        type: "text",
        payload: { content } as TextPayload,
      };

      ws.current.send(JSON.stringify(message));

      // Add user message to store
      addMessage({
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
      });
    },
    [addMessage]
  );

  const sendAction = useCallback(
    (requestId: string, actionId: string, data?: Record<string, unknown>) => {
      if (ws.current?.readyState !== WebSocket.OPEN) {
        console.error("WebSocket not connected");
        return;
      }

      const message: WebSocketMessage = {
        type: "action",
        payload: {
          request_id: requestId,
          action_id: actionId,
          data,
        } as ActionPayload,
      };

      ws.current.send(JSON.stringify(message));
      clearConfirmationRequest();
    },
    [clearConfirmationRequest]
  );

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    sendMessage,
    sendAction,
    connect,
    disconnect,
  };
}
