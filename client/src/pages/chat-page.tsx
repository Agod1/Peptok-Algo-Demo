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
  name: string;
  imageUrl: string;
  role: string;
};

async function fetchBuddy(id: string): Promise<Buddy> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export default function ChatPage() {
  const { user } = useAuth();
  const { id, msg } = useParams<{ id: string; msg?: string }>();
  const socketRef = useRef<WebSocket | null>(null);

  const { data: buddy } = useQuery<Buddy>({
    queryKey: ["/api/users", id],
    queryFn: () => fetchBuddy(id),
    enabled: !!id,
  });

  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [newMessage, setNewMessage] = useState<string>(msg || ""); // Initialize with msg if present

  useEffect(() => {
    if (msg) {
      setNewMessage(msg); // Ensure newMessage updates if msg is present in the URL
    }
  }, [msg]);
  
  useEffect(() => {
    if (!id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}/ws/chat/${id}`;
    const socket = new WebSocket(socketUrl);

    socketRef.current = socket;

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [id]);

  const handleSendMessage = () => {
    if (newMessage.trim() && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message = { sender: user.name, text: newMessage };
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
