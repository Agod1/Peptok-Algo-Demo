import React from "react";

interface MatchScoreProps {
  score: number;
}

const MatchScore: React.FC<MatchScoreProps> = ({ score }) => {
  const percentage = Math.round((score || 0) * 100);

  const getColor = (type: "bg" | "text") => {
    if (percentage >= 90) return type === "bg" ? "bg-green-600" : "text-green-600";
    if (percentage >= 80) return type === "bg" ? "bg-green-500" : "text-green-500";
    if (percentage >= 70) return type === "bg" ? "bg-green-400" : "text-green-400";
    if (percentage >= 60) return type === "bg" ? "bg-yellow-600" : "text-yellow-600";
    if (percentage >= 50) return type === "bg" ? "bg-yellow-400" : "text-yellow-400";
    if (percentage >= 40) return type === "bg" ? "bg-orange-500" : "text-orange-500";
    if (percentage >= 30) return type === "bg" ? "bg-orange-400" : "text-orange-400";
    return type === "bg" ? "bg-red-600" : "text-red-600";
  };

  return (
    <div className="flex items-center gap-2 min-w-0 sm:min-w-[8rem] w-full sm:w-auto">
      {/* Optional text label for larger screens */}
      <div className="hidden sm:block text-sm font-medium text-[#0336D0] whitespace-nowrap">
        Match
      </div>

      {/* Progress bar wrapper */}
      <div className="relative flex-1 min-w-0 h-5 sm:h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner border border-[#CDE6FB]">
        <div
          className={`absolute top-0 left-0 h-full transition-all duration-500 ${getColor("bg")}`} 
          style={{ width: `${percentage}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs sm:text-[13px] font-semibold text-white drop-shadow-sm">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

export default MatchScore;
