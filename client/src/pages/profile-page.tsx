import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Match } from "@shared/schema";

export default function ProfilePage() {
  const { user } = useAuth();
  
  const { data: matches } = useQuery<Match[]>({
    queryKey: ['/api/matches'],
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.imageUrl} alt={user.name} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{user.name}</CardTitle>
              <p className="text-muted-foreground">{user.lastWorkRole}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div>
              <h3 className="font-semibold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Details</h3>
              <dl className="grid gap-2">
                <div className="grid grid-cols-2">
                  <dt className="text-muted-foreground">Location</dt>
                  <dd>{user.location}</dd>
                </div>
                <div className="grid grid-cols-2">
                  <dt className="text-muted-foreground">MBTI Type</dt>
                  <dd>{user.mbti}</dd>
                </div>
                <div className="grid grid-cols-2">
                  <dt className="text-muted-foreground">Experience</dt>
                  <dd>{user.experience} years</dd>
                </div>
              </dl>
            </div>

            {user.role === 'mentor' && (
              <div>
                <h3 className="font-semibold mb-2">Mentor Information</h3>
                <dl className="grid gap-2">
                  <div className="grid grid-cols-2">
                    <dt className="text-muted-foreground">Maximum Mentees</dt>
                    <dd>{user.maxMatch}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-1">Motivation</dt>
                    <dd>{user.motivation}</dd>
                  </div>
                </dl>
              </div>
            )}

            {user.role === 'mentee' && (
              <div>
                <h3 className="font-semibold mb-2">Mentee Information</h3>
                <dl className="grid gap-2">
                  <div>
                    <dt className="text-muted-foreground mb-1">Career Goals</dt>
                    <dd>{user.careerGoals}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-1">Industry Needs</dt>
                    <dd>{user.industrySpecificNeeds}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
