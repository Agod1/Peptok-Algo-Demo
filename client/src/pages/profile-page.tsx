import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Match } from "@shared/schema";
import { useParams } from "wouter";
import { useState } from "react";
import { BackButton } from "@/components/ui/back-button";

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

  const isMenteeProfile = profile.role === "mentee";
  const isMentorProfile = profile.role === "mentor";

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

  const containerClasses = isMenteeProfile
    ? "bg-gradient-to-br from-[#CDE6FB] to-white min-h-screen py-10"
    : "bg-white min-h-screen py-10";

  const cardClasses = isMenteeProfile
    ? "bg-white/30 backdrop-blur-lg border border-[#CDE6FB] shadow-lg shadow-[#0336D0]/10 text-[#0336D0]"
    : "bg-white border border-[#0336D0] shadow-md text-[#0336D0]";

  return (
    <div className={containerClasses}>
      <div className="container mx-auto px-4">
        <BackButton />

        <Card className={cardClasses}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-[#0336D0] shadow-md">
                <AvatarImage src={profile.image_url || "/default-avatar.png"} alt={profile.name} />
                <AvatarFallback>{profile.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{profile.name}</CardTitle>
                <p className="text-[#0336D0]/70">{profile.last_work_role || "No role specified"}</p>
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
                      <Badge key={skill} className="bg-[#0336D0] text-white">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-[#0336D0]/70">No skills listed</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div>
                <h3 className="font-semibold mb-2">Details</h3>
                <dl className="grid gap-2">
                  <div className="grid grid-cols-2">
                    <dt className="text-[#0336D0]/70">Location</dt>
                    <dd>{profile.location || "Not specified"}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className="text-[#0336D0]/70">MBTI Type</dt>
                    <dd>{profile.mbti || "Not specified"}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className="text-[#0336D0]/70">Experience</dt>
                    <dd>{profile.experience} years</dd>
                  </div>
                  {profile.matchscore && (
                    <div className="grid grid-cols-2">
                      <dt className="text-[#0336D0]/70">Match Score</dt>
                      <dd>{`${(profile.matchscore * 100).toFixed(2)}%`}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Role-specific blocks */}
              {isMentorProfile && (
                <div>
                  <h3 className="font-semibold mb-2">Mentor Information</h3>
                  <dl className="grid gap-2">
                    <div className="grid grid-cols-2">
                      <dt className="text-[#0336D0]/70">Maximum Mentees</dt>
                      <dd>{profile.max_match}</dd>
                    </div>
                    <div>
                      <dt className="text-[#0336D0]/70 mb-1">Motivation</dt>
                      <dd>{profile.motivation || "Not specified"}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {isMenteeProfile && (
                <div>
                  <h3 className="font-semibold mb-2">Mentee Information</h3>
                  <dl className="grid gap-2">
                    <div>
                      <dt className="text-[#0336D0]/70 mb-1">Career Goals</dt>
                      <dd>{profile.career_goals || "Not specified"}</dd>
                    </div>
                    <div>
                      <dt className="text-[#0336D0]/70 mb-1">Industry Needs</dt>
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
                        className="mt-4 px-4 py-2 bg-[#0336D0] text-white rounded-md hover:bg-[#022ca7] focus:outline-none"
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
