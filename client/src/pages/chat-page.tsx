import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

const messageSound = new Audio("/sounds/mixkit-bell-notification-933.wav");

const COLORS = {
  mentee: {
    title: "text-[#000]",
    background: "bg-gradient-to-br from-[#CDE6FB] to-white",
    card: "bg-white/40 backdrop-blur-lg border border-[#CDE6FB]",
    text: "text-[#000]/70",
    avatar: "border-2 border-[#000]",
    messageOwn: "bg-[#0336D0] text-white",
    messageBuddy: "bg-white text-[#0336D0] border border-[#CDE6FB]",
    button: "bg-[#0336D0] text-white hover:bg-[#022ca7]",
  },
  mentor: {
    title: "text-[#0336D0]",
    background: "bg-white",
    card: "bg-white border border-[#0336D0]",
    text: "text-[#0336D0]/70",
    avatar: "border-2 border-[#0336D0]",
    messageOwn: "bg-[#0336D0] text-white",
    messageBuddy: "bg-white text-[#0336D0] border border-[#CDE6FB]",
    button: "bg-[#0336D0] text-white hover:bg-[#022ca7]",
  },
};

type Buddy = {
  id: string;
  name: string;
  image_url: string;
  role: string;
  matchId: string;
};

const MAX_RECONNECT_ATTEMPTS = 3;

export default function ChatPage() {
  const { user } = useAuth();
  const { id = "", msg = "" } = useParams<{ id: string; msg?: string }>();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const [messages, setMessages] = useState<{ senderId: number; text: string }[]>([]);
  const [newMessage, setNewMessage] = useState<string>(msg);

  const isMentee = user?.role === "mentee";
  const roleColors = COLORS[user?.role || "mentee"];

  useEffect(() => {
    if (msg) setNewMessage(msg);
  }, [msg]);

  useEffect(() => {
    const container = document.getElementById("chat-scroll");
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  const { data: buddy } = useQuery<Buddy>({
    queryKey: ["/api/chat/buddies", id],
    queryFn: async () => {
      const res = await fetch(`/api/chat/buddies/${id}`);
      if (!res.ok) throw new Error("Failed to fetch buddy");
      return res.json();
    },
    enabled: !!id,
  });

  useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const res = await fetch(`/api/chat/${id}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data.map((msg: any) => ({ senderId: msg.sender_id, text: msg.content })));
      console.log("Fetched messages:", data);
      return data;
    },
    enabled: !!id && !!user?.id && !!buddy?.name,
    onSuccess: (data) => {
      setMessages(
        data.map((msg: any) => ({
          senderId: msg.sender_id, // Use correct field from server
          text: msg.content,
        }))
      );
    },
  });

  useEffect(() => {
    if (!buddy?.matchId || !user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}&matchId=${buddy.matchId}`;

    const connectWebSocket = () => {
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts.current = 0;
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "message") {
          const msg = payload.message;
          console.log("Received message:", msg);
          setMessages((prev) => [
            ...prev,
            {
              senderId: msg.sender_id, // Use correct field from server
              text: msg.content,
            },
          ]);
          messageSound.play().catch(() => {});
        }
      };

      socket.onerror = (err) => console.error("WebSocket error:", err);

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
    };
  }, [buddy?.matchId, user?.id, buddy?.image_url]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !buddy || socketRef.current?.readyState !== WebSocket.OPEN) return;

    const message = {
      type: "chat",
      senderId: user.id,
      receiverId: buddy.id,
      text: newMessage,
    };

    console.log("Sending message:", message);

    socketRef.current.send(JSON.stringify(message));
    setNewMessage("");
  };

  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className={`min-h-screen ${roleColors.background} py-8`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Avatar className={`h-20 w-20 ${roleColors.avatar}`}>
            <AvatarImage src={`/${user?.image_url}`} />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className={`text-2xl font-bold ${roleColors.title}`}>{toTitleCase(user?.name || "")}</h1>
            <p className={roleColors.text}>{user?.last_work_role || ""}</p>
          </div>
        </div>

        <BackButton />

        <Card className={`${roleColors.card} shadow-lg max-w-4xl mx-auto`}>
          <CardContent>
            <div className="flex items-center gap-4 mt-6 mb-6">
              <Avatar className={`h-16 w-16 ${roleColors.avatar}`}>
                <AvatarImage src={`/${buddy?.image_url}`} alt={buddy?.name} />
                <AvatarFallback>{buddy?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className={`text-2xl font-semibold ${roleColors.title}`}>{toTitleCase(buddy?.name || "")}</h3>
                <p className={roleColors.text}>{toTitleCase(buddy?.role || "")}</p>
              </div>
            </div>

            <div id="chat-scroll" className={`h-[400px] overflow-y-auto mb-6 p-4 rounded-md ${isMentee ? "bg-white/50 backdrop-blur-md border border-[#CDE6FB]" : "bg-[#CDE6FB]"}`}>
              <div className="flex flex-col gap-4 w-full">
                {messages.map((message, index) => {
                  console.log("Rendering message:", message);
                  const isOwn = message.senderId === user.id;
                  const avatarSrc = isOwn ? user.image_url : buddy?.image_url;
                  const avatarAlt = isOwn ? user.name : buddy?.name;
                  return (
                    <div
                      key={index}
                      className={`flex ${isOwn ? "flex-row-reverse self-end" : "self-start"} items-end gap-2`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`/${avatarSrc}`} alt={avatarAlt} />
                        <AvatarFallback>{avatarAlt?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className={`p-3 max-w-xs rounded-lg ${isOwn ? roleColors.messageOwn : roleColors.messageBuddy}`}>
                        <p>{message.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Avatar className={`h-12 w-12 ${roleColors.avatar}`}>
                <AvatarImage src={`/${user?.image_url}`} />
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 p-2 rounded-md border border-[#CDE6FB] focus:outline-none focus:ring-2 focus:ring-[#0336D0]"
              />
              <Button
                onClick={handleSendMessage}
                className={`p-2 ${roleColors.button} rounded-md w-16`}
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
