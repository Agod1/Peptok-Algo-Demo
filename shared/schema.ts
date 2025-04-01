import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const VALID_MBTI = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
  name: text("name").notNull(),
  lastWorkRole: text("last_work_role"),
  skills: text("skills").array(),
  location: text("location").notNull(),
  mbti: text("mbti").notNull(),
  experience: integer("experience").notNull(),
  imageUrl: text("image_url"),
  // Mentor specific fields
  maxMatch: integer("max_match"),
  interests: text("interests").array(),
  motivation: text("motivation"),
  // Mentee specific fields
  careerGoals: text("career_goals"),
  preferredSkills: text("preferred_skills").array(),
  industrySpecificNeeds: text("industry_specific_needs").array(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull(),
  menteeId: integer("mentee_id").notNull(),
  score: numeric("score").notNull(),
  accepted: boolean("accepted").default(false),
  seen: boolean("seen").default(false),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  read: boolean("read").default(false),
});

export const MBTI_PAIRINGS: Record<string, string[]> = {
  'INTJ': ['ENTP', 'ENFP', 'INFJ'],
  'INTP': ['ENTJ', 'ENFJ', 'INFP'],
  'ENTJ': ['INTP', 'INFP', 'ENFJ'],
  'ENTP': ['INTJ', 'INFJ', 'ENFP'],
  'INFJ': ['ENTP', 'ENFP', 'INTJ'],
  'INFP': ['ENTJ', 'ENFJ', 'INTP'],
  'ENFJ': ['INTP', 'INFP', 'ENTJ'],
  'ENFP': ['INTJ', 'INFJ', 'ENTP'],
  'ISTJ': ['ESTP', 'ESFP', 'ISFJ'],
  'ISFJ': ['ESTJ', 'ESFJ', 'ISTJ'],
  'ESTJ': ['ISTP', 'ISFP', 'ESFJ'],
  'ESFJ': ['ISTJ', 'ISFJ', 'ESTJ'],
  'ISTP': ['ESTJ', 'ESFJ', 'ISFP'],
  'ISFP': ['ESTJ', 'ESFJ', 'ISTP'],
  'ESTP': ['ISTJ', 'ISFJ', 'ESFP'],
  'ESFP': ['ISTJ', 'ISFJ', 'ESTP']
};

// Helper function to convert string to array
const stringToArray = (input: string) => {
  if (!input) return [];
  return input.includes(',') 
    ? input.split(',').map(s => s.trim()).filter(Boolean)
    : [input.trim()];
};

// Schema for form handling
const baseUserSchema = {
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  lastWorkRole: z.string().min(1, "Last work role is required"),
  location: z.string().min(1, "Location is required"),
  mbti: z.enum(VALID_MBTI),
  experience: z.string().or(z.number()).transform(val => Number(val)),
  imageUrl: z.string().url("Must be a valid URL"),
};

export const insertMentorSchema = z.object({
  ...baseUserSchema,
  role: z.literal('mentor'),
  maxMatch: z.number().default(3), // Default to 3 if missing //.string().or(z.number()).transform(val => Number(val)),
  // interests: z.string().transform(stringToArray),
  interests: z.array(z.string()).nonempty("Interests cannot be empty"),
  motivation: z.string().min(1, "Motivation is required"),
  skills: z.string().min(1, "Skills specific needs are required"),//.transform(stringToArray), // ensure skills is an array of strings
});

export const insertMenteeSchema = z.object({
  ...baseUserSchema,
  role: z.literal('mentee'),
  maxMatch: z.number().default(3), // Default to 3 if missing //.string().or(z.number()).transform(val => Number(val)),
  careerGoals: z.string().min(1, "Career goals are required"),
  //interests: z.array(z.string()).nonempty("Interests cannot be empty"),
  preferredSkills: z.string().min(1, "Preferred Skills specific needs are required"),//.transform(stringToArray), // ensure preferredSkills is an array of strings
  industrySpecificNeeds: z.string().min(1, "Industry specific needs are required"),
});

export const insertMessageSchema = z.object({
  senderId: z.number(),
  receiverId: z.number(),
  content: z.string().min(1, "Message cannot be empty"),
});

export const mentorSchema = createInsertSchema(users)
.omit({ id: true, careerGoals: true, preferredSkills: true, industrySpecificNeeds: true })
.extend({
  maxMatch: z.number().int().min(1, "Max match must be at least 1").optional(),
  skills: z.array(z.string()).nonempty("Skills cannot be empty"),
  motivation: z.string().min(1, "Motivation is required"),
});

export const menteeSchema = createInsertSchema(users)
.omit({ id: true, maxMatch: true, skills: true, motivation: true })
.extend({
  careerGoals: z.string().min(1, "Career goals are required"),
  preferredSkills: z.array(z.string()).nonempty("Preferred skills cannot be empty"),
  industrySpecificNeeds: z.string().optional(),
});

export const matchWeightSchema = z.object({
  skills: z.number().min(0).max(1),
  location: z.number().min(0).max(1),
  experience: z.number().min(0).max(1),
  industryNeeds: z.number().min(0).max(1),
  mbti: z.number().min(0).max(1),
});

export const buddySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  imageUrl: z.string().url("Invalid image URL"),
  role: z.enum(["mentor", "mentee"]),
  matchId: z.string().optional(),
});

export type Mentor = z.infer<typeof mentorSchema>;
export type Mentee = z.infer<typeof menteeSchema>;
export type InsertMentor = z.infer<typeof insertMentorSchema>;
export type InsertMentee = z.infer<typeof insertMenteeSchema>;
export type User = typeof users.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type MatchWeights = z.infer<typeof matchWeightSchema>;
export type Buddy = z.infer<typeof buddySchema>;