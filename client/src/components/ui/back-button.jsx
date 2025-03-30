import { Button } from "./button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export function BackButton({ fallback = "/" }) {
  const [, setLocation] = useLocation();

  const goBack = () => {
    window.history.length > 1 ? window.history.back() : setLocation(fallback);
  };

  return (
    <Button variant="ghost" className="w-full justify-start" onClick={goBack}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  );
}
