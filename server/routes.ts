import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  User,
  Match,
  InsertMessage,
  Mentor,
  Mentee,
  MatchWeights,
} from "@shared/schema";
import { MBTI_PAIRINGS } from "../client/src/lib/config"; // Make sure this path is correct

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

function requireAuth(req: Request) {
  if (!req.isAuthenticated()) {
    throw new Error("Unauthorized");
  }
  return req.user as User;
}

// Store connected clients
const clients = new Map<number, WebSocket>();

function broadcastToUser(userId: number, message: any) {
  const client = clients.get(userId);
  if (client?.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Get matches for a mentor/mentee
  app.get("/api/matches", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string); // Convert to number
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const role = "mentee"
      const matches = await storage.getMatches(userId, role); 
      
      // if matches is empty, calculate Match Scores and store and return new matches
      if (matches.length === 0) {
        const allMentors = await storage.getUserByRole("mentor");
        const mentee = await storage.getUser(userId) as Mentee;
        if (!allMentors || !mentee) {
          return res.status(404).json({ error: "Mentors or mentee not found" });
        }
        const weights: MatchWeights = {
          skills: 0.5,
          experience: 0.3,
          industryNeeds: 0.4,
          mbti: 0.3,
          location: 0.2,
        };
        const newMatches = allMentors.map((mentor) => {
          const score = calculateMatchScore(
            mentor as Mentor,
            mentee,
            weights
          );
          return { mentorId: mentor.id, menteeId: mentee.id, score };
        });
        const createdMatches = await Promise.all(
          newMatches.map((match) =>
            storage.createMatch(match.mentorId, match.menteeId, match.score)
          )
        );
        return res.json(createdMatches);
      }

      res.json(matches);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  const calculateMatchScore = (
    mentor: Mentor,
    mentee: Mentee,
    weights: MatchWeights
  ): number => {
    // Skills match percentage
    const skillsMatch = (() => {
      const commonSkills = mentor.skills.filter((skill) =>
        mentee.preferred_skills.includes(skill)
      ).length;
      const totalSkills = mentee.preferred_skills.length || 1; // Prevent division by zero

      return (commonSkills / totalSkills) * weights.skills;
    })();

    // experience level match (binary match)
    const experienceMatch =
      mentor.experience > mentee.experience ? weights.experience : 0;

    // Industry-specific needs match (binary match)
    const industryMatch = mentor.industry_specific_needs.some((need) =>
      mentee.industry_specific_needs.includes(need)
    )
      ? weights.industryNeeds
      : 0;

    // MBTI match percentage
    const mbtiMatch = (() => {
      let score = 0;

      if (mentee.mbti in MBTI_PAIRINGS) {
        const pairings = MBTI_PAIRINGS[mentee.mbti];
        const mentorMBTIIndex = pairings.indexOf(mentor.mbti);

        if (mentorMBTIIndex !== -1) {
          score += ((3 - mentorMBTIIndex) / 3) * weights.mbti;
        }
      }

      return score;
    })();

    // Location match (binary match)
    const locationMatch =
      mentor.location === mentee.location ? weights.location : 0;

    // Calculate Total Match Percentage
    const totalScore =
      skillsMatch +
      experienceMatch +
      industryMatch +
      mbtiMatch +
      locationMatch;
    const maxPossibleScore =
      weights.skills +
      weights.experience +
      weights.industryNeeds +
      weights.mbti +
      weights.location;

    return totalScore / maxPossibleScore; // Convert to percentage
  };

  // Get available mentors for a mentee
  app.get("/api/me/mentors", async (req, res) => {
    try {
      const user = requireAuth(req);
      if (user.role !== "mentee") {
        return res.status(403).json({ error: "Only mentees can view mentors" });
      }
      const mentors = await storage.getMentorsForMentee(user.id);
      res.json(mentors);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  // Get available mentors for a mentee
  app.get("/api/mentors", async (req, res) => {
    try {
      const mentors = await storage.getUserByRole("mentor");
      res.json(mentors);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  // Get available mentees
  app.get("/api/mentees", async (req, res) => {
    try {
      const mentees = await storage.getUserByRole("mentee");
      res.json(mentees);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  // Accept a match
  app.post("/api/matches/:id/accept", async (req, res) => {
    try {
      const user = requireAuth(req); // Ensure the user is authenticated
      const matchId = parseInt(req.params.id);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }
      const match = await storage.updateMatch(matchId, { accepted: true });
      res.json(match);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  // Mark match as seen
  app.post("/api/matches/:id/seen", async (req, res) => {
    try {
      const user = requireAuth(req); // Ensure the user is authenticated
      const matchId = parseInt(req.params.id);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }
      const match = await storage.updateMatch(matchId, { seen: true });
      res.json(match);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  // Add chat routes
  app.get("/api/messages/:userId", async (req, res) => {
    try {
      const user = requireAuth(req);
      const otherId = parseInt(req.params.userId);
      if (isNaN(otherId)) {
        return res.status(400).json({ error: "Invalid other user ID" });
      }
      const messages = await storage.getMessages(user.id, otherId);
      res.json(messages);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  app.get("/api/messages/unread/count", async (req, res) => {
    try {
      const user = requireAuth(req);
      const count = await storage.getUnreadMessageCount(user.id);
      res.json({ count });
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const userId = req.session?.userId;
    if (!userId) {
      ws.close();
      return;
    }

    clients.set(userId, ws);

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString()) as InsertMessage;
        const savedMessage = await storage.createMessage(message);

        // Send to both sender and receiver
        broadcastToUser(message.senderId, {
          type: "message",
          message: savedMessage,
        });
        broadcastToUser(message.receiverId, {
          type: "message",
          message: savedMessage,
        });
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            error: (error as Error).message,
          })
        );
      }
    });

    ws.on("close", () => {
      clients.delete(userId);
    });
  });

  return httpServer;
}
