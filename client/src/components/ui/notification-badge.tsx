import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "absolute -top-2 -right-2 min-w-[1.25rem] h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs font-medium",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </div>
  );
}
