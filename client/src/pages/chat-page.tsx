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
  image_url: string;
  role: string;
  matchId: string;
};

const MAX_RECONNECT_ATTEMPTS = 3;

async function fetchBuddy(id: string): Promise<Buddy> {
  const res = await fetch(`/api/chat/buddies/${id}`);
  if (!res.ok) throw new Error("Failed to fetch buddy");
  return res.json();
}

async function fetchMessages(id: string) {
  const res = await fetch(`/api/chat/${id}`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export default function ChatPage() {
  const { user } = useAuth();
  const { id = "", msg = "" } = useParams<{ id: string; msg?: string }>();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [newMessage, setNewMessage] = useState<string>(msg);

  const isMentee = user?.role === "mentee";

  useEffect(() => {
    if (msg) setNewMessage(msg);
  }, [msg]);

  const { data: buddy } = useQuery<Buddy>({
    queryKey: ["/api/chat/buddies", id],
    queryFn: () => fetchBuddy(id),
    enabled: !!id,
  });

  useQuery({
    queryKey: ["messages", id],
    queryFn: () => fetchMessages(id),
    enabled: !!id,
    onSuccess: (data) => setMessages(data),
  });

  useEffect(() => {
    if (!buddy?.matchId || !user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}/ws/chat?userId=${user.id}&matchId=${buddy.matchId}`;

    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const connectWebSocket = () => {
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setMessages((prev) => [...prev, message]);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onerror = (error) => console.error("WebSocket Error:", error);

      socket.onclose = (event) => {
        if (!event.wasClean && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const retryDelay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
          reconnectAttempts.current += 1;
          setTimeout(connectWebSocket, retryDelay);
        }
      };
    };

    connectWebSocket();

    return () => {
      socketRef.current?.close(1000, "Component unmounted");
      socketRef.current = null;
    };
  }, [buddy?.matchId, user?.id]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !buddy || socketRef.current?.readyState !== WebSocket.OPEN) return;

    const message = { type: "chat", chatRoom: buddy.matchId, sender: user.name, text: newMessage };
    socketRef.current.send(JSON.stringify(message));
    setMessages((prev) => [...prev, message]);
    setNewMessage("");
  };

  return (
    <div className={`min-h-screen ${isMentee ? "bg-gradient-to-br from-[#CDE6FB] to-white" : "bg-white"} py-8`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Avatar className="h-20 w-20 border-2 border-[#0336D0]">
            <AvatarImage src={`/${user?.image_url}`} />
            <AvatarFallback>{user?.name?.split("")[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-[#0336D0]">{user?.name}</h1>
            <p className="text-[#0336D0]/70">{user?.last_work_role || ""}</p>
          </div>
        </div>

        <BackButton />

        <Card className={`${isMentee ? "bg-white/40 backdrop-blur-lg border border-[#CDE6FB]" : "bg-white border border-[#0336D0]"} shadow-lg max-w-4xl mx-auto`}>
          <CardContent>
            <div className="flex items-center gap-4 mt-6 mb-6">
              <Avatar className="h-16 w-16 border border-[#0336D0]">
                <AvatarImage src={`/${buddy?.image_url}`} alt={buddy?.name} />
                <AvatarFallback>{buddy?.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-2xl font-semibold text-[#0336D0]">{buddy?.name}</h3>
                <p className="capitalize text-[#0336D0]/70">{buddy?.role}</p>
              </div>
            </div>

            <div className={`h-[400px] overflow-y-auto mb-6 p-4 rounded-md ${isMentee ? "bg-white/50 backdrop-blur-md border border-[#CDE6FB]" : "bg-[#CDE6FB]"}`}>
              <div className="flex flex-col gap-4">
                {messages.map((message, index) => {
                  const isOwn = message.sender === user.name;
                  return (
                    <div key={index} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`p-3 max-w-xs rounded-lg ${isOwn ? "bg-[#0336D0] text-white" : "bg-white text-[#0336D0] border border-[#CDE6FB]"}`}>
                        <p>{message.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Avatar className="h-12 w-12 border border-[#0336D0]">
                <AvatarImage src={`/${user?.image_url}`} />
                <AvatarFallback>{user?.name?.split("")[0]}</AvatarFallback>
              </Avatar>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 rounded-md border border-[#CDE6FB] focus:outline-none focus:ring-2 focus:ring-[#0336D0]"
              />
              <Button
                onClick={handleSendMessage}
                className="p-2 bg-[#0336D0] text-white rounded-md hover:bg-[#022ca7] w-16"
                disabled={!newMessage.trim()}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
