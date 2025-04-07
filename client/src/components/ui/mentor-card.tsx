import { User } from "@shared/schema";
import { Card, CardContent, CardFooter } from "./card";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import { MessageSquare, Video } from "lucide-react";
import { useLocation } from "wouter";
import MatchScore from "@/components/ui/match-score";

type MentorCardProps = {
  mentor: User & { matchScore: number; accepted: boolean };
  highlight?: boolean;
  onSelect?: () => void;
  showActions?: boolean;
};

export function MentorCard({ mentor, highlight, onSelect, showActions }: MentorCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] border-2 ${
        highlight
          ? "border-[#000] shadow-md shadow-[#000]/20"
          : "border-[#CDE6FB]"
      } bg-white`}
      onClick={onSelect}
    >
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <Avatar className="h-16 w-16 border border-[#000] shadow-sm">
            <AvatarImage src={mentor.image_url} alt={mentor.name} />
            <AvatarFallback className="text-[#000] bg-[#CDE6FB]">
              {mentor.name[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full min-w-0">
              <h3 className="font-semibold text-lg text-[#000] truncate">{mentor.name}</h3>
              {mentor.matchscore !== undefined && (
                <div className="sm:flex-shrink-0 sm:w-auto min-w-0">
                  <MatchScore score={mentor.matchscore} />
                </div>
              )}
            </div>
            {/* #0336D0 */}

            <p className="text-sm text-[#000]/70 mt-1">
              {mentor.experience} years of experience in{" "}
              {mentor.industry_specific_needs?.join(", ") || "N/A"}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {mentor.skills?.slice(0, 3).map((skill) => (
                <Badge
                  key={skill}
                  className="bg-[#CDE6FB] text-[#000] border border-[#000]"
                  variant="outline"
                >
                  {skill}
                </Badge>
              ))}
              {mentor.skills?.length > 3 && (
                <Badge
                  className="bg-[#CDE6FB] text-[#000] border border-[#000]"
                  variant="outline"
                >
                  +{mentor.skills.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {(showActions || mentor.accepted) && (
        <CardFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2 mt-2">
          <Button
            variant="outline"
            className="w-full sm:flex-1 border-[#000] text-[#000] hover:bg-[#000] hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/chat/${mentor.id}`);
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </Button>
          <Button
            variant="outline"
            className="w-full sm:flex-1 border-[#000] text-[#000] hover:bg-[#000] hover:text-white"
          >
            <Video className="mr-2 h-4 w-4" />
            Video
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
