import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { Button } from "./button";
import { Menu, MessageSquare, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationBadge } from "./notification-badge";

export function NavMenu() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { unreadCount } = useNotifications();

  if (!user) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="fixed top-4 right-4 z-50">
          <Menu className="h-6 w-6" />
          {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 pb-4 border-b">
            <User className="h-6 w-6" />
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">
                {user.role === 'mentor' ? 'Mentor' : 'Mentee'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              onClick={() => setLocation('/profile')}
            >
              Profile
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start relative" 
              onClick={() => setLocation('/messages')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Messages
              {unreadCount > 0 && (
                <NotificationBadge 
                  count={unreadCount} 
                  className="scale-75"
                />
              )}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              onClick={() => {
                logoutMutation.mutate();
                setLocation('/auth');
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}