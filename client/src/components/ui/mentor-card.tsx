import { User } from "@shared/schema";
import { Card, CardContent, CardFooter } from "./card";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import { MessageSquare, Video } from "lucide-react";
import { useLocation } from "wouter";
import MatchScore from "@/components/ui/match-score";

type MentorCardProps = {
  mentor: User & { matchScore: number, accepted: boolean };
  highlight?: boolean;
  onSelect?: () => void;
  showActions?: boolean;
};

export function MentorCard({ mentor, highlight, onSelect, showActions }: MentorCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card 
      className={`cursor-pointer transition-all hover:scale-[1.02] bg-green-100 ${
        highlight ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={mentor.imageUrl} alt={mentor.name} />
            <AvatarFallback>{mentor.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center w-full flex-col md:flex-wrap sm:flex-row">
              {/* Mentor name takes available space */}
              <h3 className="font-semibold text-lg flex-grow truncate">{mentor.name}</h3>

              {/* Match score stays on the right on larger screens, falls under on smaller screens */}
              {mentor.matchscore !== undefined && (
                <div className="sm:ml-4 mt-2 sm:mt-0">
                  <MatchScore score={mentor.matchscore} />
                </div>
              )}
            </div>
            <p className="text-muted-foreground">{mentor.experience} years of experience in {mentor.industry_specific_needs}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {mentor.skills.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="outline">{skill}</Badge>
              ))}
              {mentor.skills.length > 3 && (
                <Badge variant="outline">+{mentor.skills.length - 3}</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      {(showActions || mentor.accepted) && (
        <CardFooter className="gap-2">
          <Button variant="outline" className="flex-1"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click event
              setLocation(`/chat/${mentor.id}`);
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </Button>
          <Button variant="outline" className="flex-1">
            <Video className="mr-2 h-4 w-4" />
            Video
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
