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
    <div className="flex items-center gap-3">
      {/* Show text separately on larger screens */}
      <div className="hidden sm:block text-md font-semibold">
        {/* <span className={`${getColor("text")}`}>{percentage}%</span>{" "} */}
        <span className="text-gray-500">Match</span>
      </div>

      {/* Progress Bar with text inside for small screens */}
      <div className="relative w-full sm:w-32 h-5 sm:h-4 bg-gray-400 rounded-full overflow-hidden shadow-md flex items-center">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-500 ${getColor("bg")}`}
          style={{ width: `${percentage}%` }}
        />
        <span className="absolute w-full text-xs sm:text-sm font-semibold text-center text-white">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

export default MatchScore;
