import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { Message } from '@shared/schema';

type ChatMessage = {
  type: 'message' | 'error';
  message?: Message;
  error?: string;
};

export function useChat() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
    };

    ws.onclose = () => {
      setConnected(false);
      setSocket(null);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as ChatMessage;
      if (data.type === 'message' && data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    };

    return () => {
      ws.close();
    };
  }, [user]);

  const sendMessage = useCallback((receiverId: number, content: string) => {
    if (!socket || !user) return;

    const message = {
      senderId: user.id,
      receiverId,
      content,
    };

    socket.send(JSON.stringify(message));
  }, [socket, user]);

  const loadMessages = useCallback(async (otherId: number) => {
    if (!user) return;
    const response = await fetch(`/api/messages/${otherId}`);
    if (response.ok) {
      const messages = await response.json();
      setMessages(messages);
    }
  }, [user]);

  return {
    connected,
    messages,
    sendMessage,
    loadMessages,
  };
}
