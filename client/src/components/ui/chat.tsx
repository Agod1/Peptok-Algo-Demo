import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/use-chat';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Button } from './button';
import { Input } from './input';
import { Card, CardContent, CardFooter, CardHeader } from './card';
import { ScrollArea } from './scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

type ChatProps = {
  recipientId: number;
  recipientName: string;
  recipientImage: string;
};

export function Chat({ recipientId, recipientName, recipientImage }: ChatProps) {
  const { user } = useAuth();
  const { messages, sendMessage, loadMessages } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadMessages(recipientId);
  }, [recipientId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Mark messages as read when viewed
    queryClient.setQueryData(['/api/messages/unread/count'], (old: number) => 
      Math.max(0, (old || 0) - messages.filter(m => !m.read && m.receiverId === user?.id).length)
    );
  }, [messages, queryClient, user?.id]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage(recipientId, newMessage);
    setNewMessage('');
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={recipientImage} />
            <AvatarFallback>{recipientName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{recipientName}</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-start gap-2 max-w-[80%]",
              message.senderId === user?.id ? "ml-auto" : "mr-auto"
            )}
          >
            {message.senderId !== user?.id && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={recipientImage} />
                <AvatarFallback>{recipientName[0]}</AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                "rounded-lg p-3",
                message.senderId === user?.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {message.content}
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="flex-none p-4 gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button onClick={handleSend}>Send</Button>
      </CardFooter>
    </Card>
  );
}