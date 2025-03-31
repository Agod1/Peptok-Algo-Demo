import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MenteeCard } from "@/components/ui/mentee-card";
import { Match, User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

export default function MentorDashboard() {
  const queryClient = useQueryClient();
  const { data: matches } = useQuery<Match[]>({ queryKey: ["/api/me/mentees"] });
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const unseenCount = matches?.filter((m) => !m.seen).length || 0;

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onmessage = (event) => {
      const newMatch = JSON.parse(event.data);
      queryClient.setQueryData(["/api/me/mentees"], (oldMatches: Match[] = []) => [
        newMatch,
        ...oldMatches,
      ]);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      socket.close();
    };
  }, [queryClient]);

  // Fallback: Polling every second
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries(["/api/me/mentees"]);
    }, 1000);
    return () => clearInterval(interval);
  }, [queryClient]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Your Mentees</h1>
        {unseenCount > 0 && (
          <Badge variant="destructive" className="relative">
            <Bell className="h-4 w-4 mr-1" />
            {unseenCount} new matches
          </Badge>
        )}
      </div>

      {matches?.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No mentees have matched with you yet. Check back later!
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {matches?.map((match) => (
            <MenteeCard
              key={match.id}
              mentee={match as User & { matchscore: number }}
              showActions
              highlight={!match.seen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
