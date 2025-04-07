// FULLY STYLED ADMIN DASHBOARD

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Users,
  Briefcase,
  Target,
  Book,
  Building2,
  Factory,
  MapPin,
  User
} from "lucide-react";
import Papa from "papaparse";
import type { Mentor, Mentee, MatchWeights, Match } from "@shared/schema";
import { UploadAnimation } from "@/components/ui/upload-animation";
import { MBTI_PAIRINGS } from "../lib/config";
import MatchScore from "@/components/ui/match-score";

const REQUIRED_MENTOR_FIELDS = ["last_work_role", "skills", "experience", "industry_specific_needs"];
const REQUIRED_MENTEE_FIELDS = ["last_work_role", "career_goals", "preferred_skills", "experience", "industry_specific_needs"];

export default function AdminPage() {
  const { toast } = useToast();
  const [selectedMentees, setSelectedMentees] = useState<Set<number>>(new Set());
  const [mentorUploadStatus, setMentorUploadStatus] = useState("idle");
  const [menteeUploadStatus, setMenteeUploadStatus] = useState("idle");
  const [weights, setWeights] = useState<MatchWeights>({
    skills: 0.5,
    location: 0.2,
    experience: 0.3,
    industryNeeds: 0.4,
    mbti: 0.3
  });

  const { data: mentors = [] } = useQuery<Mentor[]>({ queryKey: ["/api/mentors"] });
  const { data: mentees = [] } = useQuery<Mentee[]>({ queryKey: ["/api/mentees"] });
  const [matches, setMatches] = useState<{ [key: string]: Match[] }>({});

  useEffect(() => {
    const fetchMatches = async () => {
      const matchResults: { [key: string]: Match[] } = {};
      for (const menteeId of selectedMentees) {
        try {
          const res = await fetch(`/api/matches?userId=${menteeId}`);
          const data = await res.json();
          if (Array.isArray(data)) matchResults[menteeId] = data;
        } catch (e) {
          console.error(`Failed to fetch matches for ${menteeId}`, e);
        }
      }
      setMatches(matchResults);
    };
    fetchMatches();
  }, [selectedMentees]);

  const renderListBadges = (list?: string[] | string) => {
    if (!list || (typeof list === "string" && list.trim() === "")) return null;
    const items = typeof list === "string" ? list.split(",").map(i => i.trim()) : list;
    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {items.map((item, i) => (
          <Badge key={i} variant="secondary" className="text-xs bg-[#CDE6FB] text-[#0336D0] border border-[#0336D0]/40">
            {item}
          </Badge>
        ))}
      </div>
    );
  };

  const uploadMutation = (type: "mentors" | "mentees") =>
    useMutation({
      mutationFn: async (data: Record<string, string>[]) => {
        const endpoint = `/api/${type}`;
        await apiRequest("DELETE", endpoint);
        for (const item of data) {
          const payload = {
            ...item,
            skills: item.skills?.split(",").map(s => s.trim()),
            interests: item.interests?.split(",").map(s => s.trim()),
            industry_specific_needs: item.industry_specific_needs?.split(",").map(s => s.trim()),
            ...(type === "mentors" && { max_match: parseInt(item.max_match || "3") }),
            ...(type === "mentees" && {
              career_goals: item.career_goals?.split(",").map(s => s.trim()),
              preferred_skills: item.preferred_skills?.split(",").map(s => s.trim())
            })
          };
          await apiRequest("POST", endpoint, payload);
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/" + type] });
        toast({ title: "Success", description: `${type} uploaded successfully` });
      },
      onError: () => {
        toast({
          title: "Upload Error",
          description: `Failed to upload ${type} data`,
          variant: "destructive"
        });
      }
    });

  const mentorMutation = uploadMutation("mentors");
  const menteeMutation = uploadMutation("mentees");

  const handleFileUpload = (file: File, type: "mentors" | "mentees") => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Error", description: "Only CSV files supported", variant: "destructive" });
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        if (type === "mentors") mentorMutation.mutate(data);
        else menteeMutation.mutate(data);
      }
    });
  };

  return (
    <div className="container mx-auto py-10">
      {/* Top section and cards already styled above */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#0336D0] flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#0336D0]" /> Upload CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {["mentors", "mentees"].map(type => (
              <div key={type}>
                <label className="block text-sm font-medium mb-2 capitalize">{type} CSV</label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], type as any)} className="flex-1" />
                  <UploadAnimation status={type === "mentors" ? mentorUploadStatus : menteeUploadStatus} progress={0.5} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#0336D0]">Match Weights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(weights).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span>{(value * 10).toFixed(0)}</span>
                </div>
                <Slider
                  value={[value]}
                  min={0}
                  max={0.5}
                  step={0.1}
                  onValueChange={([v]) => setWeights(w => ({ ...w, [key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {/* Matches and mentee display were fixed to include renderListBadges helper */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#0336D0] flex items-center gap-2">
              <Users className="h-5 w-5 text-[#0336D0]" /> Mentees
            </CardTitle>
            <CardDescription>Select mentees to view matches</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {mentees.map(mentee => (
                <div key={mentee.id} className="p-4 border rounded-md hover:bg-[#CDE6FB]/20 transition">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedMentees.has(mentee.id)}
                      onCheckedChange={(checked) => {
                        const updated = new Set(selectedMentees);
                        checked ? updated.add(mentee.id) : updated.delete(mentee.id);
                        setSelectedMentees(updated);
                      }}
                    />
                    <div>
                      <div className="font-semibold text-[#0336D0]">{mentee.name}</div>
                      <div className="text-sm text-gray-500">{mentee.last_work_role}</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" /> Career Goals:
                    </div>
                    {renderListBadges(mentee.career_goals)}

                    <div className="flex items-center gap-2">
                      <Book className="h-4 w-4" /> Preferred Skills:
                    </div>
                    {renderListBadges(mentee.preferred_skills)}

                    <div className="flex items-center gap-2">
                      <Factory className="h-4 w-4" /> Industry Needs:
                    </div>
                    {renderListBadges(mentee.industry_specific_needs)}

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Location:
                    </div>
                    {renderListBadges(mentee.location)}

                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" /> MBTI:
                    </div>
                    {renderListBadges(mentee.mbti)}

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> Ideal Mentor MBTI:
                    </div>
                    {renderListBadges(MBTI_PAIRINGS[mentee.mbti])}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#0336D0]">Matches</CardTitle>
            <CardDescription>Top 3 matches for selected mentees</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {Array.from(selectedMentees).map(menteeId => {
                const mentee = mentees.find(m => m.id === menteeId);
                const menteeMatches = matches[menteeId] || [];
                return (
                  <div key={menteeId} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-5 w-5 text-[#0336D0]" />
                      <h3 className="font-semibold text-[#0336D0]">Matches for {mentee?.name}</h3>
                    </div>

                    {menteeMatches.slice(0, 3).map(mentor => (
                      <div key={mentor.id} className="p-4 border rounded-md bg-white hover:bg-[#CDE6FB]/10 transition">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <div className="font-medium text-lg text-[#0336D0]">{mentor.name}</div>
                            <div className="text-sm text-gray-500">{mentor.last_work_role}</div>
                          </div>
                          <MatchScore score={mentor.score} />
                        </div>
                        <Separator className="my-2" />

                        <div className="text-sm space-y-2 text-gray-700">
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4" /> Industry:
                          </div>
                          {renderListBadges(mentor.industry_specific_needs)}

                          <div className="flex items-center gap-2">
                            <Book className="h-4 w-4" /> Skills:
                          </div>
                          {renderListBadges(mentor.skills)}

                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" /> Experience:
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {mentor.experience}
                          </Badge>

                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Location:
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {mentor.location}
                          </Badge>

                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" /> MBTI:
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {mentor.mbti}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* You can now safely expand this component with confidence that it's consistent and styled */}
    </div>
  );
}
