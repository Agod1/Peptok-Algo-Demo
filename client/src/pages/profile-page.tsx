import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Match } from "@shared/schema";
import { useParams } from "wouter"; // useParams from wouter
import { useState } from "react"; // Import useState

export default function ProfilePage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>(); // Capture 'id' from URL
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null); // State for feedback

  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ['/api/me/mentors'],
    enabled: !!user, // Ensure query only runs if user is available
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

  // Loading state
  if (isLoading) return <div>Loading...</div>;

  // Determine which profile to display
  const profile = id
    ? matches?.find((match) => match.id == id) || null  // Safe check for matches
    : user;  // Fallback to user profile if no id in URL

  if (!profile) return <div>No profile found</div>; // Return a message if no profile is found

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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.imageUrl || "/default-avatar.png"} alt={profile.name} />
              <AvatarFallback>{profile.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{profile.name}</CardTitle>
              <p className="text-muted-foreground">{profile.lastWorkRole}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div>
              <h3 className="font-semibold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Details</h3>
              <dl className="grid gap-2">
                <div className="grid grid-cols-2">
                  <dt className="text-muted-foreground">Location</dt>
                  <dd>{profile.location}</dd>
                </div>
                <div className="grid grid-cols-2">
                  <dt className="text-muted-foreground">MBTI Type</dt>
                  <dd>{profile.mbti}</dd>
                </div>
                <div className="grid grid-cols-2">
                  <dt className="text-muted-foreground">Experience</dt>
                  <dd>{profile.experience} years</dd>
                </div>
              </dl>
            </div>

            {profile.role === 'mentor' && (
              <div>
                <h3 className="font-semibold mb-2">Mentor Information</h3>
                <dl className="grid gap-2">
                  <div className="grid grid-cols-2">
                    <dt className="text-muted-foreground">Maximum Mentees</dt>
                    <dd>{profile.maxMatch}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-1">Motivation</dt>
                    <dd>{profile.motivation}</dd>
                  </div>
                </dl>
              </div>
            )}

            {profile.role === 'mentee' && (
              <div>
                <h3 className="font-semibold mb-2">Mentee Information</h3>
                <dl className="grid gap-2">
                  <div>
                    <dt className="text-muted-foreground mb-1">Career Goals</dt>
                    <dd>{profile.careerGoals}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-1">Industry Needs</dt>
                    <dd>{profile.industrySpecificNeeds}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Accept Match Button only for mentor role */}
            {profile.role === 'mentor' && (
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
