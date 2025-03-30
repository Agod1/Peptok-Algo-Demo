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
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to accept match");
      }

      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  const profile = id ? matches?.find((match) => match.id == id) || null : user;

  if (!profile) return <div>No profile found</div>;

  const handleAcceptMatch = () => {
    if (profile && profile.matchid) {
      acceptMatchMutation.mutate(profile.matchid, {
        onSuccess: () => {
          setFeedbackMessage("Match accepted successfully!");
        },
        onError: (error: any) => {
          setFeedbackMessage(`Error: ${error.message}`);
        },
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.image_url || "/default-avatar.png"} alt={profile.name} />
              <AvatarFallback>{profile.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{profile.name}</CardTitle>
              <p className="text-muted-foreground">{profile.last_work_role || "No role specified"}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div>
              <h3 className="font-semibold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.length > 0 ? (
                  profile.skills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)
                ) : (
                  <p className="text-muted-foreground">No skills listed</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Details</h3>
              <dl className="grid gap-2">
                <div className="grid grid-cols-2">
                  <dt className="text-muted-foreground">Location</dt>
                  <dd>{profile.location || "Not specified"}</dd>
                </div>
                <div className="grid grid-cols-2">
                  <dt className="text-muted-foreground">MBTI Type</dt>
                  <dd>{profile.mbti || "Not specified"}</dd>
                </div>
                <div className="grid grid-cols-2">
                  <dt className="text-muted-foreground">Experience</dt>
                  <dd>{profile.experience} years</dd>
                </div>
                {profile.matchscore && (
                <div className="grid grid-cols-2">
                  <dt className="text-muted-foreground">Match Score</dt>
                  <dd>{`${(profile.matchscore * 100).toFixed(2)}%`}</dd>
                </div>)}
              </dl>
            </div>

            {profile.role === "mentor" && (
              <div>
                <h3 className="font-semibold mb-2">Mentor Information</h3>
                <dl className="grid gap-2">
                  <div className="grid grid-cols-2">
                    <dt className="text-muted-foreground">Maximum Mentees</dt>
                    <dd>{profile.max_match}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-1">Motivation</dt>
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
                    <dt className="text-muted-foreground mb-1">Career Goals</dt>
                    <dd>{profile.career_goals || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-1">Industry Needs</dt>
                    <dd>{profile.industry_specific_needs?.join(", ") || "Not specified"}</dd>
                  </div>
                </dl>
              </div>
            )}

            {user.role === "mentee" && !profile.accepted && profile.role === "mentor" && (
              <div>
                <button
                  onClick={handleAcceptMatch}
                  className="mt-4 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
                >
                  Accept Match
                </button>
                {feedbackMessage && (
                  <p className="mt-4 text-sm text-green-600">{feedbackMessage}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
