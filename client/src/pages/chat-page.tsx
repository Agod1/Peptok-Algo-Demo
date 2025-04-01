import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

type Buddy = {
  id: string;
  name: string;
  imageUrl: string;
  role: string;
  matchId: string;
};

const MAX_RECONNECT_ATTEMPTS = 5;

async function fetchBuddy(id: string): Promise<Buddy> {
  const res = await fetch(`/api/chat/buddies/${id}`);
  if (!res.ok) throw new Error("Failed to fetch buddy");
  return res.json();
}

export default function ChatPage() {
  const { user } = useAuth();
  const { id, msg } = useParams<{ id: string; msg?: string }>();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);

  const { data: buddy } = useQuery<Buddy>({
    queryKey: ["/api/chat/buddies", id],
    queryFn: () => fetchBuddy(id),
    enabled: !!id,
  });

  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [newMessage, setNewMessage] = useState<string>(msg || "");

  useEffect(() => {
    if (msg) setNewMessage(msg);
  }, [msg]);

  useEffect(() => {
    console.log("ChatPage useEffect", { buddy, user });
    if (!buddy?.matchId || !user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}/ws/chat?userId=${user.id}&matchId=${buddy.matchId}`;

    // Prevent duplicate WebSocket connections
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const connectWebSocket = () => {
      const socket = new WebSocket(socketUrl);
      console.log("Connecting WebSocket:", { socketUrl });

      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected successfully");
        reconnectAttempts.current = 0; // Reset reconnect attempts
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setMessages((prevMessages) => [...prevMessages, message]);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
      };

      socket.onclose = (event) => {
        console.log("WebSocket closed", event.reason);

        if (!event.wasClean && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const retryDelay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000); // Exponential backoff
          reconnectAttempts.current += 1;
          setTimeout(connectWebSocket, retryDelay);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000, "Component unmounted");
        socketRef.current = null;
      }
    };
  }, [buddy?.matchId]);

  const handleSendMessage = () => {
    console.log({
      task: "handleSendMessage called",
      newMessage,
      buddy,
      readyState: socketRef.current?.readyState,
    });

    if (newMessage.trim() && buddy && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message = { type: "chat", chatRoom: buddy.matchId, sender: user.name, text: newMessage };
      socketRef.current.send(JSON.stringify(message));
      setMessages((prevMessages) => [...prevMessages, message]);
      setNewMessage("");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton />
      <Card className="shadow-lg max-w-4xl mx-auto">
        <CardContent>
          <div className="flex items-center gap-4 mt-6 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={buddy?.imageUrl} alt={buddy?.name} />
              <AvatarFallback>{buddy?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-2xl font-semibold">{buddy?.name}</h3>
              <p className="text-muted-foreground capitalize">{buddy?.role}</p>
            </div>
          </div>

          <div className="h-[400px] overflow-y-auto mb-6 bg-gray-100 p-4 rounded-md">
            <div className="flex flex-col gap-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.sender === user.name ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`p-3 max-w-xs rounded-lg ${
                      message.sender === user.name ? "bg-blue-500 text-white" : "bg-gray-300 text-black"
                    }`}
                  >
                    <p>{message.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={handleSendMessage}
              className="p-2 bg-blue-600 text-white rounded-md w-16 hover:bg-blue-700"
              disabled={!newMessage.trim()}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
