import { Sheet, SheetContent, SheetTrigger, SheetClose } from "./sheet";
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

  const isMentor = user.role === "mentor";

  const handleNavigate = (path: string) => {
    setLocation(path);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 right-4 z-50 text-[#0336D0] hover:bg-[#CDE6FB]/40"
        >
          <Menu className="h-6 w-6" />
          {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
        </Button>
      </SheetTrigger>

      <SheetContent className="bg-white text-[#0336D0] px-6 pt-6">
        <div className="flex flex-col gap-6">
          {/* User Info */}
          <div className="flex items-center gap-4 border-b pb-4">
            <User className="h-6 w-6" />
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-[#0336D0]/60 capitalize">
                {isMentor ? "Mentor" : "Mentee"}
              </p>
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="space-y-3">
            <SheetClose asChild>
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-[#CDE6FB]/30"
                onClick={() => handleNavigate("/profile")}
              >
                Profile
              </Button>
            </SheetClose>

            <SheetClose asChild>
              <Button
                variant="ghost"
                className="w-full justify-start relative hover:bg-[#CDE6FB]/30"
                onClick={() => handleNavigate("/messages")}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Messages
                {unreadCount > 0 && (
                  <NotificationBadge count={unreadCount} className="scale-75" />
                )}
              </Button>
            </SheetClose>

            <SheetClose asChild>
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-[#CDE6FB]/30"
                onClick={() => {
                  logoutMutation.mutate();
                  handleNavigate("/auth");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
