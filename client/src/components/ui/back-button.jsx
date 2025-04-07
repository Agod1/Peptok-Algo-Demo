import { Button } from "./button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export function BackButton({ fallback = "/" }) {
  const [, setLocation] = useLocation();

  const goBack = () => {
    window.history.length > 1 ? window.history.back() : setLocation(fallback);
  };

  return (
    <Button
      variant="ghost"
      className="
        w-fit px-3 py-2 text-sm text-[#0336D0] hover:bg-[#CDE6FB]/30 
        rounded-md transition items-center flex gap-2
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0336D0]
      "
      onClick={goBack}
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  );
}
