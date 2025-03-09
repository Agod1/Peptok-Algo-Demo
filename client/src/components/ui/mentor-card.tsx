import { User } from "@shared/schema";
import { Card, CardContent, CardFooter } from "./card";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import { MessageSquare, Video } from "lucide-react";

type MentorCardProps = {
  mentor: User & { matchScore: number };
  highlight?: boolean;
  onSelect?: () => void;
  showActions?: boolean;
};

export function MentorCard({ mentor, highlight, onSelect, showActions }: MentorCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:scale-[1.02] ${
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
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{mentor.name}</h3>
              <Badge variant={highlight ? "default" : "secondary"}>
                Match: {Math.round(mentor.matchScore * 100)}%
              </Badge>
            </div>
            <p className="text-muted-foreground">{mentor.lastWorkRole}</p>
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
      {showActions && (
        <CardFooter className="gap-2">
          <Button variant="outline" className="flex-1">
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
