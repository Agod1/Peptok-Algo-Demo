import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, User, Users, AlertTriangle, Briefcase, Target, Book, Lightbulb, Building2, Factory, MapPin } from "lucide-react";
import Papa from "papaparse";
import type { Mentor, Mentee, MatchWeights, Match } from "@shared/schema";
// import { findBestMatches } from "@/lib/matching";
import { UploadAnimation } from "@/components/ui/upload-animation";
import { MBTI_PAIRINGS } from "../lib/config";
import MatchScore from "@/components/ui/match-score";

const REQUIRED_MENTOR_FIELDS = ['last_work_role', 'skills', 'experience', 'industry_specific_needs'];
const REQUIRED_MENTEE_FIELDS = ['last_work_role', 'career_goals', 'preferred_skills', 'experience', 'industry_specific_needs'];

type UploadStatus = "idle" | "uploading" | "success" | "error";
type MatchResult = Mentor & { matchScore: number };

function validateCSVData(data: Record<string, string>[], requiredFields: string[]): string | null {
  if (!data || data.length === 0) {
    return "The CSV file appears to be empty";
  }

  const missingFields = requiredFields.filter(field => !Object.keys(data[0]).includes(field));
  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(", ")}`;
  }

  // Validate that required fields are not empty
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === '') {
        return `Row ${i + 1} has an empty ${field}`;
      }

      // Validate max_match is a number for mentors
      if (field === 'max_match' && isNaN(parseInt(row[field]))) {
        return `Row ${i + 1} has an invalid max_match value. Must be a number.`;
      }

      // Validate comma-separated lists
      if (['skills', 'interests', 'industry_specific_needs', 'career_goals', 'preferred_skills'].includes(field)) {
        const values = row[field].split(',');
        if (values.length === 0 || values.every(v => v.trim() === '')) {
          return `Row ${i + 1} has an invalid ${field} list. Must be comma-separated values.`;
        }
      }
    }
  }

  return null;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [selectedMentees, setSelectedMentees] = useState<Set<number>>(new Set());
  const [mentorUploadStatus, setMentorUploadStatus] = useState<UploadStatus>("idle");
  const [menteeUploadStatus, setMenteeUploadStatus] = useState<UploadStatus>("idle");
  const [weights, setWeights] = useState<MatchWeights>({
    skills: 0.5,
    location: 0.2,
    experience: 0.3,
    industryNeeds: 0.4,
    mbti: 0.3
  });

  const { data: mentors = [] } = useQuery<Mentor[]>({
    queryKey: ["/api/mentors"]
  });

  const { data: mentees = [] } = useQuery<Mentee[]>({
    queryKey: ["/api/mentees"]
  });

  const [matches, setMatches] = useState<{ [key: string]: Match[] }>({}); // To store matches for each mentee

  useEffect(() => {
    // Fetch matches for each selected mentee
    const fetchMatches = async () => {
      const matchResults: { [key: string]: Match[] } = {}; // Temporary object to hold all matches
      for (const menteeId of selectedMentees) {
        try{
        const fetchedMatches = await getMatchesForMentee(menteeId);
        matchResults[menteeId] = fetchedMatches; // Store fetched matches by menteeId
        }
        catch(e){
          console.error(`Failed to get matches for ${menteeId} - `, e)
        }
      }

      setMatches(matchResults); // Set all fetched matches to state
    };

    fetchMatches();
  }, [selectedMentees]); // Dependency array ensures this runs when mentees or selectedMentees change


  const uploadMentors = useMutation({
    mutationFn: async (data: Record<string, string>[]) => {
      setMentorUploadStatus("uploading");
      await apiRequest("DELETE", "/api/mentors");
      for (const mentor of data) {
        await apiRequest("POST", "/api/mentors", {
          ...mentor,
          skills: mentor.skills.split(",").map((s: string) => s.trim()),
          interests: mentor.interests.split(",").map((s: string) => s.trim()),
          industry_specific_needs: mentor.industry_specific_needs.split(",").map((s: string) => s.trim()),
          max_match: mentor.max_match ? parseInt(mentor.max_match) || 3 : 3,
        });
      }
    },
    onSuccess: () => {
      setMentorUploadStatus("success");
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      toast({
        title: "Success",
        description: "Mentor data uploaded successfully",
      });
      setTimeout(() => setMentorUploadStatus("idle"), 2000);
    },
    onError: (error) => {
      setMentorUploadStatus("error");
      toast({
        title: "Error",
        description: "Failed to upload mentor data. Please check the console for details.",
        variant: "destructive"
      });
      console.error("Mentor upload error:", error);
      setTimeout(() => setMentorUploadStatus("idle"), 2000);
    }
  });

  const uploadMentees = useMutation({
    mutationFn: async (data: Record<string, string>[]) => {
      setMenteeUploadStatus("uploading");
      await apiRequest("DELETE", "/api/mentees");
      for (const mentee of data) {
        await apiRequest("POST", "/api/mentees", {
          ...mentee,
          career_goals: mentee.career_goals.split(",").map((s: string) => s.trim()),
          preferred_skills: mentee.preferred_skills.split(",").map((s: string) => s.trim()),
          interests: mentee.interests.split(",").map((s: string) => s.trim()),
          industry_specific_needs: mentee.industry_specific_needs.split(",").map((s: string) => s.trim())
        });
      }
    },
    onSuccess: () => {
      setMenteeUploadStatus("success");
      queryClient.invalidateQueries({ queryKey: ["/api/mentees"] });
      toast({
        title: "Success",
        description: "Mentee data uploaded successfully",
      });
      setTimeout(() => setMenteeUploadStatus("idle"), 2000);
    },
    onError: (error) => {
      setMenteeUploadStatus("error");
      toast({
        title: "Error",
        description: "Failed to upload mentee data. Please check the console for details.",
        variant: "destructive"
      });
      console.error("Mentee upload error:", error);
      setTimeout(() => setMenteeUploadStatus("idle"), 2000);
    }
  });

  const handleFileUpload = (file: File, type: "mentors" | "mentees") => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Check for parsing errors
        if (results.errors.length > 0) {
          const errorMessage = results.errors
            .map(err => `Row ${err.row + 1}: ${err.message}`)
            .join('\n');
          toast({
            title: "CSV Parse Error",
            description: `Failed to parse CSV file:\n${errorMessage}`,
            variant: "destructive"
          });
          return;
        }

        // Validate data structure
        const error = validateCSVData(
          results.data,
          type === "mentors" ? REQUIRED_MENTOR_FIELDS : REQUIRED_MENTEE_FIELDS
        );

        if (error) {
          toast({
            title: "Validation Error",
            description: error,
            variant: "destructive"
          });
          return;
        }

        // Proceed with upload if validation passes
        if (type === "mentors") {
          uploadMentors.mutate(results.data);
        } else {
          uploadMentees.mutate(results.data);
        }
      },
      error: (error) => {
        toast({
          title: "Error",
          description: `Failed to parse CSV file: ${error.message}`,
          variant: "destructive"
        });
      }
    });
  };

  const getMatchesForMentee = async (menteeId: number) => {
    try {
      const response = await fetch(`/api/matches?userId=${menteeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error(`Error fetching matches: ${response.statusText}`);
      }
  
      const data = await response.json();
  
      // Check if the response is in the expected format
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format: expected an array of matches');
      }
  
      return data; // If the response is already an array, return it directly
    } catch (error) {
      console.error('Error fetching mentee matches:', error);
      throw error;
    }
  };


  const CreateMatchesButton = ({ mentee }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
  
    const handleCreateMatches = async () => {
      setLoading(true);
      setError(null);

  
      try {
        const response = await fetch("/api/matches", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: mentee.id, // mentee's ID
            weights: weights,   // weights object
          }),
        });
  
        if (!response.ok) {
          throw new Error(`Error creating matches: ${response.statusText}`);
        }
  
        const data = await response.json();
        console.log("Matches created:", data);
        // Handle successful creation of matches (e.g., update UI or display success message)
        //setSelectedMentees(mentee);
      } catch (error) {
        setError(error.message);
        console.error("Error creating matches:", error);
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <div className="mt-4 space-y-2">
        <button
          onClick={handleCreateMatches}
          className={`w-auto py-1 px-3 text-sm text-white font-semibold rounded-md shadow-sm focus:outline-none ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-400"
          } transition duration-300`}
          disabled={loading}
        >
          {loading ? "Creating Matches..." : "Create New Matches"}
        </button>
        {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
      </div>
    );
  };

  const renderListBadges = (list?: string[] | string) => {
    if (!list || (typeof list === "string" && list.trim() === "")) {
      return <div className="flex flex-wrap gap-1 mt-1"></div>;
    }
  
    let items: string[];
  
    if (Array.isArray(list)) {
      items = list.map(item => item.toString().trim()); // Ensure all items are strings
    } else if (typeof list === "string") {
      items = list
        .split(",")
        .map(item => item.trim())
        .filter(item => item !== ""); // Remove empty values
    } else {
      console.error("Unexpected type:", list);
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="secondary" className="text-xs">
            {String(list)}
          </Badge>
        </div>
      );
    }
  
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((item, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    );
  };


  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mentors CSV</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".csv"
                  disabled={uploadMentors.isPending}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "mentors")}
                  className="flex-1" // Ensures input takes up available space
                />
                <UploadAnimation status={mentorUploadStatus} progress={0.5} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mentees CSV</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".csv"
                  disabled={uploadMentees.isPending}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "mentees")}
                  className="flex-1" // Ensures input takes up available space
                />
                <UploadAnimation status={menteeUploadStatus} progress={0.5} />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Required fields:</p>
              <p><strong>Mentors:</strong> {REQUIRED_MENTOR_FIELDS.map(field => field.replace(/_/g, " ")).join(", ")}</p>
              <p><strong>Mentees:</strong> {REQUIRED_MENTEE_FIELDS.map(field => field.replace(/_/g, " ")).join(", ")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Match Weights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {Object.entries(weights).map(([key, value]) => {
              const formattedKey = key.toUpperCase() === "MBTI" ? key.toUpperCase() : key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());
              return (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium">
                      {formattedKey}
                    </label>
                    <span className="text-sm font-medium text-muted-foreground">
                      {(value * 10).toFixed(0)}
                    </span>
                  </div>
                  <Slider
                    value={[value]}
                    min={0}
                    max={0.5}
                    step={0.1}
                    onValueChange={([newValue]) =>
                      setWeights(w => ({ ...w, [key]: newValue }))
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Mentees
            </CardTitle>
            <CardDescription>
              Select mentees to view their best mentor matches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {mentees.map(mentee => (
                <div key={mentee.id} className="flex items-start space-x-4 p-4 hover:bg-muted/50 rounded-lg transition-colors">
                  <Checkbox
                    checked={selectedMentees.has(mentee.id)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedMentees);
                      if (checked) {
                        newSelected.add(mentee.id);
                      } else {
                        newSelected.delete(mentee.id);
                      }
                      setSelectedMentees(newSelected);
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{mentee.name}</div>
                      <div className="text-sm text-muted-foreground">{mentee.last_work_role}</div>
                    </div>
                    <CreateMatchesButton mentee={mentee} />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span>Career Goals:</span>
                    </div>
                    {renderListBadges(mentee.career_goals)}
              
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Book className="h-4 w-4" />
                      <span>Preferred Skills:</span>
                    </div>
                    {renderListBadges(mentee.preferred_skills)}
              
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>Years of Experience:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {mentee?.experience}
                      </Badge>
                    </div>
              
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Factory className="h-4 w-4" />
                      <span>Industry-Specific Needs:</span>
                    </div>
                    {renderListBadges(mentee.industry_specific_needs)}
              
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Location:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {mentee?.location}
                      </Badge>
                    </div>
              
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>MBTI:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {mentee?.mbti}
                      </Badge>
                    </div>
              
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Ideal Mentor's MBTI:</span>
                    </div>
                    {renderListBadges(MBTI_PAIRINGS[mentee.mbti])}
                  </div>
                </div>
              ))}

            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matches</CardTitle>
            <CardDescription>
              Top 3 mentor matches for selected mentees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {Array.from(selectedMentees).map(menteeId => {
                const mentee = mentees.find(m => m.id === menteeId);
                if (!mentee) return null;

                const menteeMatches = matches[menteeId] || [];

                // Ensure matches is an array
                if (!Array.isArray(menteeMatches)) {
                  console.error('Matches is not an array:', menteeMatches);
                  return null;
                }

                return (
                  <div key={menteeId} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-2 mb-4">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">
                        Matches for {mentee.name}
                      </h3>
                      <div className="text-sm text-muted-foreground">{mentee.last_work_role}</div>
                    </div>

                    <div className="space-y-4">
                      {menteeMatches
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 3)
                        .map((mentor, index) => (
                          <div
                            key={mentor.id}
                            className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium text-lg">{mentor.name}</div>
                                  <div className="text-sm text-muted-foreground">{mentor.last_work_role}</div>
                                </div>
                              </div>
                              <MatchScore score={mentor.score} />
                            </div>

                            <Separator className="my-3" />

                            <div className="space-y-3">
                              <div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                  <Factory className="h-4 w-4" />
                                  <span>Industry Experience:</span>
                                </div>
                                {renderListBadges(mentor.industry_specific_needs)}
                              </div>

                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                <span>Years of Experience:</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {mentor?.experience}
                                </Badge>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                  <Book className="h-4 w-4" />
                                  <span>Skills:</span>
                                </div>
                                {renderListBadges(mentor.skills)}
                              </div>

                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>Location:</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {mentor?.location}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>MBTI:</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {mentor?.mbti}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
