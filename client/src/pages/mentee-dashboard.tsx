import { useQuery } from "@tanstack/react-query";
import { MentorCard } from "@/components/ui/mentor-card";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { Pagination } from "@/components/ui/pagination";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function MenteeDashboard() {
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();
  const itemsPerPage = 10;

  const { data: mentors, isLoading } = useQuery<Array<User & { matchscore: number }>>({
    queryKey: ['/api/me/mentors'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const sortedMentors = mentors?.sort((a, b) => b.matchscore - a.matchscore) || [];
  const topMatches = sortedMentors.filter(m => m.matchscore > 0).slice(0, 3);
  const paginatedMentors = sortedMentors.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="container mx-auto px-4 py-8">
      {topMatches.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mb-4">Top Matches</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {topMatches.map((mentor) => (
              <MentorCard
                key={mentor.id}
                mentor={mentor}
                highlight
                onSelect={() => setLocation(`/profile/${mentor.id}`)}
              />
            ))}
          </div>
        </>
      )}

      <h2 className="text-2xl font-bold mb-4">All Mentors</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {paginatedMentors.map((mentor) => (
          <MentorCard
            key={mentor.id}
            mentor={mentor}
            onSelect={() => setLocation(`/profile/${mentor.id}`)}
          />
        ))}
      </div>

      <div className="mt-8">
        <Pagination
          total={Math.ceil(sortedMentors.length / itemsPerPage)}
          value={page}
          onChange={setPage}
        />
      </div>
    </div>
  );
}
