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
      className={`cursor-pointer transition-all hover:scale-[1.02] bg-blue-100 ${
        highlight ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={mentee.imageUrl} alt={mentee.name} />
            <AvatarFallback>{mentee.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
          <div className="flex flex-wrap items-center">
            <h3 className="font-semibold text-lg truncate">{mentee.name}</h3>
            {mentee.matchscore !== undefined && (
              <div className="ml-auto mt-1 basis-full sm:basis-auto sm:mt-0">
                <MatchScore score={mentee.matchscore} />
              </div>
            )}
          </div>
          <p className="text-muted-foreground">Interested in {mentee.interests}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {mentee.preferred_skills?.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="outline">{skill}</Badge>
            ))}
            {mentee.preferred_skills?.length > 3 && (
              <Badge variant="outline">+{mentee.preferred_skills.length - 3}</Badge>
            )}
          </div>
          </div>
        </div>
      </CardContent>
      {showActions && (
        <CardFooter className="gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setLocation(`/chat/${mentee.id}`)}
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
