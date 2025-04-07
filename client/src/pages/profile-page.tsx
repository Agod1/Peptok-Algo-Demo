import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Match } from "@shared/schema";
import { useParams } from "wouter";
import { useState } from "react";
import { BackButton } from "@/components/ui/back-button";

const COLORS = {
  mentee: {
    background: "bg-gradient-to-br from-[#CDE6FB] to-white",
    card: "bg-white/30 backdrop-blur-lg border border-[#000] shadow-lg shadow-[#000]/10 text-[#000]",
    badge: "bg-[#000] text-white",
    text: "text-[#000]/70",
    button: "bg-[#000] text-white hover:bg-[#022ca7]",
    avatar: "border-2 border-[#000] shadow-md",
  },
  mentor: {
    background: "bg-white",
    card: "bg-white border border-[#0336D0] shadow-md text-[#0336D0]",
    badge: "bg-[#0336D0] text-white",
    text: "text-[#0336D0]/70",
    button: "bg-[#0336D0] text-white hover:bg-[#022ca7]",
    avatar: "border-2 border-[#0336D0] shadow-md",
  },
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ["/api/me/mentors"],
    enabled: !!user,
  });

  const acceptMatchMutation = useMutation({
    mutationFn: async (matchid: string) => {
      const response = await fetch(`/api/matches/${matchid}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to accept match");
      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  const profile = id ? matches?.find((match) => match.id == id) || null : user;
  if (!profile) return <div>No profile found</div>;

  const roleColors = COLORS[profile.role];

  const handleAcceptMatch = () => {
    if (profile && profile.matchid) {
      acceptMatchMutation.mutate(profile.matchid, {
        onSuccess: () => {
          setFeedbackMessage("Match accepted successfully!");
          window.location.reload();
        },
        onError: (error: any) => {
          setFeedbackMessage(`Error: ${error.message}`);
        },
      });
    }
  };

  return (
    <div className={`${roleColors.background} min-h-screen py-10`}>
      <div className="container mx-auto px-4">
        <BackButton />

        <Card className={roleColors.card}>
          <CardHeader>
            <div className="flex items-center gap-4">
              
              <Avatar className={`h-20 w-20 ${roleColors.avatar}`}>
                <AvatarImage src={profile.image_url || "/default-avatar.png"} alt={profile.name} />
                <AvatarFallback>{profile.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{profile.name}</CardTitle>
                <p className={roleColors.text}>{profile.last_work_role || "No role specified"}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6">
              {/* Skills */}
              <div>
                <h3 className="font-semibold mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills?.length > 0 ? (
                    profile.skills.map((skill) => (
                      <Badge key={skill} className={roleColors.badge}>
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className={roleColors.text}>No skills listed</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div>
                <h3 className="font-semibold mb-2">Details</h3>
                <dl className="grid gap-2">
                  <div className="grid grid-cols-2">
                    <dt className={roleColors.text}>Location</dt>
                    <dd>{profile.location || "Not specified"}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className={roleColors.text}>MBTI Type</dt>
                    <dd>{profile.mbti || "Not specified"}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className={roleColors.text}>Experience</dt>
                    <dd>{profile.experience} years</dd>
                  </div>
                  {profile.matchscore && (
                    <div className="grid grid-cols-2">
                      <dt className={roleColors.text}>Match Score</dt>
                      <dd>{`${(profile.matchscore * 100).toFixed(2)}%`}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Role-specific blocks */}
              {profile.role === "mentor" && (
                <div>
                  <h3 className="font-semibold mb-2">Mentor Information</h3>
                  <dl className="grid gap-2">
                    <div className="grid grid-cols-2">
                      <dt className={roleColors.text}>Maximum Mentees</dt>
                      <dd>{profile.max_match}</dd>
                    </div>
                    <div>
                      <dt className={`${roleColors.text} mb-1`}>Motivation</dt>
                      <dd>{profile.motivation || "Not specified"}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {profile.role === "mentee" && (
                <div>
                  <h3 className="font-semibold mb-2">Mentee Information</h3>
                  <dl className="grid gap-2">
                    <div>
                      <dt className={`${roleColors.text} mb-1`}>Career Goals</dt>
                      <dd>{profile.career_goals || "Not specified"}</dd>
                    </div>
                    <div>
                      <dt className={`${roleColors.text} mb-1`}>Industry Needs</dt>
                      <dd>{profile.industry_specific_needs?.join(", ") || "Not specified"}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Mentee sees accept button for mentor */}
              {user.role === "mentee" && profile.role === "mentor" && (
                <div>
                  {profile.accepted ? (
                    <p className="mt-4 text-sm text-green-600">Match accepted</p>
                  ) : (
                    <div>
                      <button
                        onClick={handleAcceptMatch}
                        className={`mt-4 px-4 py-2 rounded-md focus:outline-none ${roleColors.button}`}
                      >
                        Accept Match
                      </button>
                      {feedbackMessage && (
                        <p className="mt-2 text-sm text-green-600">{feedbackMessage}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}