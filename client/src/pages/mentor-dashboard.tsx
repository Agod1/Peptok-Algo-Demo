import { useQuery } from "@tanstack/react-query";
import { MentorCard } from "@/components/ui/mentor-card";
import { Match, User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { useState } from "react";

export default function MentorDashboard() {
  const { data: matches } = useQuery<Match[]>({
    queryKey: ['/api/matches'],
  });

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  const unseenCount = matches?.filter(m => !m.seen).length || 0;

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
            <MentorCard
              key={match.id}
              mentor={user as User & { matchScore: number }}
              showActions
              highlight={!match.seen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
