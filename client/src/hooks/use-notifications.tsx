import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from './use-auth';

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['/api/messages/unread/count'],
    queryFn: async () => {
      const response = await fetch('/api/messages/unread/count');
      if (!response.ok) throw new Error('Failed to fetch unread count');
      const data = await response.json();
      return data.count;
    },
    enabled: !!user,
  });

  // Listen for new messages via WebSocket and update the unread count
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message' && data.message.receiverId === user.id) {
        // Increment unread count
        queryClient.setQueryData(['/api/messages/unread/count'], (old: number) => old + 1);
      }
    };

    return () => ws.close();
  }, [user, queryClient]);

  return {
    unreadCount,
  };
}
