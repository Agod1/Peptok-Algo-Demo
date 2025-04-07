import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MenteeCard } from "@/components/ui/mentee-card";
import { Match, User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries(["/api/me/mentees"]);
    }, 1000);
    return () => clearInterval(interval);
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-[#CDE6FB] py-10">
      <div className="container mx-auto px-4">
        {/* Mentor Profile Header */}
        <div className="flex items-center gap-4 mb-8 bg-white p-6 rounded-xl border border-[#0336D0] shadow-md">
          <Avatar className="h-20 w-20 border-2 border-[#0336D0] shadow-sm">
            <AvatarImage src={user?.image_url} />
            <AvatarFallback>{user?.name?.split("")[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-[#0336D0]">{user?.name}</h1>
            <p className="text-[#0336D0]/70">{user?.last_work_role || ""}</p>
          </div>
        </div>

        {/* Notification Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-[#0336D0]">Your Mentees</h2>
          {unseenCount > 0 && (
            <Badge className="bg-[#0336D0] text-white hover:bg-[#022ca7]">
              <Bell className="h-4 w-4 mr-1" />
              {unseenCount} new matches
            </Badge>
          )}
        </div>

        {/* Mentee Grid */}
        {matches?.length === 0 ? (
          <Card className="p-8 text-center border border-[#0336D0] bg-white shadow-sm text-[#0336D0]/70">
            <p>No mentees have matched with you yet. Check back later!</p>
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
    </div>
  );
}
