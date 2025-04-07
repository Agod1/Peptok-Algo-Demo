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
    matchId?: number;
  }
}

function requireAuth(req: Request) {
  if (!req.isAuthenticated()) {
    throw new Error("Unauthorized");
  }
  return req.user as User;
}

// Store connected clients
const clients = new Map<string, WebSocket>(); // Maps userId -> WebSocket
const chatRooms = new Map<string, Set<WebSocket>>(); // Maps matchId -> Set of WebSockets

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
      const role = "mentee";
      const matches = await storage.getMatches(userId, role);

      if (matches.length === 0) {
        return res.status(404).json({ error: "No matches found" });
      }

      res.json(matches);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  // Create new matches if none exist for a mentor/mentee, with weights from body
  app.post("/api/matches", async (req, res) => {
    try {
      const userId = parseInt(req.body.userId as string); // Get userId from the body
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const weights: MatchWeights = req.body.weights; // Get weights from the body

      // Ensure weights are valid
      if (!weights || typeof weights !== "object" || Object.keys(weights).length === 0) {
        return res.status(400).json({ error: "Invalid weights provided" });
      }

      const allMentors = await storage.getUserByRole("mentor");
      const mentee = await storage.getUser(userId) as Mentee;

      if (!allMentors || !mentee) {
        return res.status(404).json({ error: "Mentors or mentee not found" });
      }
      // Delete existing matches for the mentee before creating new ones
      await storage.deleteMatchesForUser(userId, 'mentee');

      const newMatches = allMentors.map((mentor) => {
        const score = calculateMatchScore(mentor as Mentor, mentee, weights);

        return { mentorId: mentor.id, menteeId: mentee.id, score };
      });

      const createdMatches = await Promise.all(
        newMatches.map((match) =>
          storage.createMatch(match.mentorId, match.menteeId, match.score)
        )
      );

      res.json(createdMatches);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });


  const calculateMatchScore = (
    mentor: Mentor,
    mentee: Mentee,
    weights: MatchWeights
  ): number => {

    console.log('mentor', mentor);
    console.log('mentee', mentee);
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
      const mentors = await storage.getScoreMentorsForMentee(user.id);
      res.json(mentors);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  // Get available mentees for a mentor
  app.get("/api/me/mentees", async (req, res) => {
    try {
      const user = requireAuth(req);  // Ensure the user is authenticated

      if (user.role != "mentor") {  // Check that the user is a mentor
        return res.status(403).json({ error: "Only mentors can view mentees" });
      }

      // Fetch the mentees assigned to the mentor
      const mentees = await storage.getMenteesForMentor(user.id);  // Retrieve mentees from the database or storage
      res.json(mentees);  // Return the mentees as a response
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



  // Get available users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();

      // Ensure users is always an array
      if (!Array.isArray(users)) {
        console.error("Error: Expected an array but got", users);
        return res.status(500).json({ error: "Invalid user data format" });
      }

      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get a user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });


  // Create mentors
  app.post("/api/mentors", async (req, res) => {
    try {
        const mentorData = req.body;
        const newMentor = await storage.createMentor(mentorData);
        res.status(201).json(newMentor);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
  });

  // Delete all mentors
  app.delete("/api/mentors", async (req, res) => {
    try {
        await storage.deleteUsersByRole("mentor");
        res.json({ message: "All mentors deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
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


  // Create mentees
  app.post("/api/mentees", async (req, res) => {
    try {
        const menteeData = req.body;
        const newMentee = await storage.createMentee(menteeData);
        res.status(201).json(newMentee);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
  });

  // Delete all mentees
  app.delete("/api/mentees", async (req, res) => {
    try {
        await storage.deleteUsersByRole("mentee");
        res.json({ message: "All mentees deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
  });

  // Fetch chat history
  app.get("/api/chat/:buddyId", async (req, res) => {
    const user = requireAuth(req);
    const userId = user.id;
    const buddyId = req.params.buddyId;
    
    try {
        const chats = await storage.getMessages(userId, buddyId);
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
  });
  
  // Get chat buddy by buddyId
  app.get("/api/chat/buddies/:buddyId", async (req, res) => {
    const user = requireAuth(req);
    const userId = user.id;
    const buddyId = req.params.buddyId;

    try {
      const buddy = await storage.getChatsBuddy(userId, buddyId, user.role);
      console.log('buddy', buddy);
      res.json(buddy);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  // Store message when WebSockets aren't available
  app.post("/api/chat/:buddyId", async (req, res) => {
    try {
      const { text } = req.body;
      const user = requireAuth(req);
      const userId = user.id;
      const buddyId = Number(req.params.buddyId); // Ensure buddyId is a number
  
      // Create an object matching the expected InsertMessage type
      const chat = {
        senderId: userId,
        receiverId: buddyId,
        content: text,
      };
  
      // Store the message
      const newMessage = await storage.createMessage(chat);
  
      res.status(201).json(newMessage);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Accept a match
  app.post("/api/matches/:id/accept", async (req, res) => {
    try {
      // const user = requireAuth(req); // Ensure the user is authenticated
      // console.log('user', user);  
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
      //const user = requireAuth(req); // Ensure the user is authenticated
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
      console.log('message', user.id, otherId);
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
    const user = req.user as User;
    const session = req.session;
  
    console.log("WebSocket connected:", { userId, url: req.url, user, session });
  
    if (!userId) {
      ws.close();
      return;
    }
  
    clients.set(userId, ws);
  
    ws.on("message", async (data) => {
      try {
        console.log("Received message:", data.toString());
        const message = JSON.parse(data.toString());
    
        if (message.action === "isOpened") {
          console.log(`User ${userId} opened content/chat.`);
          return;
        }
    
        const savedMessage = await storage.createMessage({ ...message, type: "chat" });
    
        broadcastToUser(message.senderId, { type: "message", message: savedMessage });
        broadcastToUser(message.receiverId, { type: "message", message: savedMessage });
      } catch (error) {
        ws.send(JSON.stringify({ type: "error", error: error.message }));
      }
    });
  
    ws.on("close", () => {
      clients.delete(userId);
      console.log("Disconnected:", userId);
    });
  });  

  return httpServer;
}
