import { useQuery } from "@tanstack/react-query";
import { MentorCard } from "@/components/ui/mentor-card";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { Pagination } from "@/components/ui/pagination";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import DialogBox from "@/components/ui/delay-dialog";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function MenteeDashboard() {
  const [page, setPage] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [acceptedMentor, setAcceptedMentor] = useState<User | null>(null);
  const [matchAcceptedTime, setMatchAcceptedTime] = useState<number | null>(null);
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const [, setLocation] = useLocation();
  const itemsPerPage = 10;
  const message = "Hello, I'd like some guidance with the fishery industry.";

  const { data: mentors, isLoading } = useQuery<Array<User & { matchscore: number }>>({
    queryKey: ['/api/me/mentors'],
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (mentors && mentors.length > 0) {
      const mentor = mentors.find((m) => m.accepted === true);
      if (mentor) {
        setAcceptedMentor(mentor);
        setMatchAcceptedTime(Date.now());
      }
    }
  }, [mentors]);

  useEffect(() => {
    if (matchAcceptedTime) {
      const timer = setTimeout(() => {
        setShowDialog(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [matchAcceptedTime]);

  const handleSendMessage = () => {
    if (!acceptedMentor) return;
    setLocation(`/chat/${acceptedMentor.id}/${message}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#CDE6FB]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0336D0]" />
      </div>
    );
  }

  const sortedMentors = mentors?.sort((a, b) => b.matchscore - a.matchscore) || [];
  const topMatches = sortedMentors.filter(m => m.matchscore > 0).slice(0, 3);
  const paginatedMentors = sortedMentors.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#CDE6FB] to-white text-[#0336D0]">
      {/* Glass background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute w-[180%] h-[180%] -top-1/2 -left-1/2 bg-gradient-to-tr from-[#0336D0] via-[#CDE6FB] to-white rounded-full blur-[140px] opacity-30" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-10">
        {/* Glass card for user info */}
        <div className="flex items-center gap-5 mb-8 bg-white/30 backdrop-blur-lg p-6 rounded-2xl border border-[#CDE6FB] shadow-md">
          <Avatar className="h-20 w-20 border-2 border-[#0336D0] shadow">
            <AvatarImage src={user?.image_url} />
            <AvatarFallback>{user?.name?.split("")[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-[#0336D0]">{user?.name}</h1>
            <p className="text-[#0336D0]/80">{user?.last_work_role || ""}</p>
          </div>
        </div>

        {topMatches.length > 0 && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-[#0336D0]">Top Matches</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {topMatches.map((mentor) => (
                <div className="bg-white/40 backdrop-blur-md p-4 rounded-xl border border-[#CDE6FB] shadow-sm">
                  <MentorCard
                    key={mentor.id}
                    mentor={mentor}
                    highlight
                    onSelect={() => setLocation(`/profile/${mentor.id}`)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="text-2xl font-semibold mb-4 text-[#0336D0]">All Mentors</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {paginatedMentors.map((mentor) => (
            <div className="bg-white/40 backdrop-blur-md p-4 rounded-xl border border-[#CDE6FB] shadow-sm">
              <MentorCard
                key={mentor.id}
                mentor={mentor}
                onSelect={() => setLocation(`/profile/${mentor.id}`)}
              />
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Pagination
            total={Math.ceil(sortedMentors.length / itemsPerPage)}
            value={page}
            onChange={setPage}
          />
        </div>

        <DialogBox
          isVisible={showDialog}
          message={message}
          onClose={() => setShowDialog(false)}
          onConfirm={handleSendMessage}
        />
      </div>
    </div>
  );
}
