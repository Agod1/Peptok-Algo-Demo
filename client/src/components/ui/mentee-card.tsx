import { User } from "@shared/schema";
import { Card, CardContent, CardFooter } from "./card";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import { MessageSquare, Video } from "lucide-react";
import { useLocation } from "wouter";
import MatchScore from "@/components/ui/match-score";

type MenteeCardProps = {
  mentee: User & { matchScore?: number };
  highlight?: boolean;
  onSelect?: () => void;
  showActions?: boolean;
};

export function MenteeCard({ mentee, highlight, onSelect, showActions }: MenteeCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] border-2 ${
        highlight
          ? "border-[#0336D0] shadow-md shadow-[#0336D0]/30"
          : "border-[#CDE6FB]"
      } bg-white`}
      onClick={onSelect}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border border-[#0336D0] shadow-sm">
            <AvatarImage src={mentee.image_url} alt={mentee.name} />
            <AvatarFallback className="text-[#0336D0] bg-[#CDE6FB]">
              {mentee.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="font-semibold text-lg text-[#0336D0] truncate">{mentee.name}</h3>
              {mentee.matchscore !== undefined && (
                <div className="min-w-0">
                  <MatchScore score={mentee.matchscore} />
                </div>
              )}
            </div>
            <p className="text-sm text-[#0336D0]/70 mt-1">
              Interested in {mentee.interests}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {mentee.preferred_skills?.slice(0, 3).map((skill) => (
                <Badge
                  key={skill}
                  className="bg-[#CDE6FB] text-[#0336D0] border border-[#0336D0]"
                  variant="outline"
                >
                  {skill}
                </Badge>
              ))}
              {mentee.preferred_skills?.length > 3 && (
                <Badge
                  className="bg-[#CDE6FB] text-[#0336D0] border border-[#0336D0]"
                  variant="outline"
                >
                  +{mentee.preferred_skills.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="gap-2 mt-2">
          <Button
            variant="outline"
            className="flex-1 border-[#0336D0] text-[#0336D0] hover:bg-[#0336D0] hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/chat/${mentee.id}`);
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-[#0336D0] text-[#0336D0] hover:bg-[#0336D0] hover:text-white"
          >
            <Video className="mr-2 h-4 w-4" />
            Video
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
