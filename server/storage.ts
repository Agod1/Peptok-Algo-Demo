import { User, Match, Message, type Mentor, type InsertMentor, type Mentee, InsertMentee, InsertMessage } from "@shared/schema";
import pg from 'pg'; 
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Mentor operations
  getMentors(): Promise<Mentor[]>;
  createMentor(mentor: InsertMentor): Promise<Mentor>;
  clearMentors(): Promise<void>;
  
  // Mentee operations  
  getMentees(): Promise<Mentee[]>;
  createMentee(mentee: InsertMentee): Promise<Mentee>;
  clearMentees(): Promise<void>;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createMentor(mentor: InsertMentor): Promise<User>;
  createMentee(mentee: InsertMentee): Promise<User>;

  // Match operations
  getMatches(userId: number, role: 'mentor' | 'mentee'): Promise<Match[]>;
  createMatch(mentorId: number, menteeId: number, score: number): Promise<Match>;
  updateMatch(id: number, update: Partial<Match>): Promise<Match>;
  getMentorsForMentee(menteeId: number): Promise<Array<User & { matchScore: number }>>;

  // Message operations
  getMessages(userId: number, otherId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: number): Promise<Message>;
  getUnreadMessageCount(userId: number): Promise<number>;

  // Session store
  sessionStore: session.Store;
}

export class DbStorage implements IStorage {
  private pool: Pool;
  sessionStore: session.Store;

  constructor() {
    this.pool = new Pool({
      user: 'postgres',  // Use your postgres user
      host: 'db',        // Docker service name for PostgreSQL (from docker-compose)
      database: 'peptok', // Database name
      password: 'peptokpassword',  // Password
      port: 5432,
    });
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0];
  }

  async createMentor(mentor: InsertMentor): Promise<User> {
    const skills = Array.isArray(mentor.skills) ? mentor.skills : mentor.skills.split(',').map((s) => s.trim());
    const interests = Array.isArray(mentor.interests) ? mentor.interests : mentor.interests.split(',').map((s) => s.trim());
    const industry_specific_needs = Array.isArray(mentor.industry_specific_needs) 
      ? mentor.industry_specific_needs 
      : mentor.industry_specific_needs.split(',').map((s) => s.trim());
  
    const res = await this.pool.query(
      `INSERT INTO users 
        (email, password, role, name, last_work_role, skills, location, mbti, experience, image_url, 
        max_match, interests, motivation, career_goals, preferred_skills, industry_specific_needs) 
      VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10, $11, $12::text[], $13, $14, $15, $16::text[]) 
      RETURNING *`,
      [
        mentor.email,
        mentor.password ? await bcrypt.hash(mentor.password, 10) : await bcrypt.hash('password', 10),
        "mentor",
        mentor.name,
        mentor.lastWorkRole,
        skills, // Pass directly as an array
        mentor.location,
        mentor.mbti,
        mentor.experience,
        mentor.imageUrl || null, // Ensure imageUrl doesn't break query
        mentor.maxMatch !== undefined ? mentor.maxMatch : 3, // Default max_match to 3
        interests, // Pass directly as an array
        mentor.motivation || null,
        null, // Mentees-only fields
        null,
        industry_specific_needs // Pass directly as an array
      ]
    );
  
    return res.rows[0];
  }
  
  async createMentee(mentee: InsertMentee): Promise<User> {
    // Validate required fields
    if (!mentee.email || !mentee.name || !mentee.location || !mentee.mbti || mentee.experience === undefined) {
      throw new Error('Missing required fields: email, name, location, mbti, experience');
    }
  
    // Ensure all fields are properly defined with default values
    const career_goals = Array.isArray(mentee.career_goals) ? mentee.career_goals : mentee.career_goals?.split(',').map(s => s.trim()) || [];
    const preferred_skills = Array.isArray(mentee.preferred_skills) ? mentee.preferred_skills : mentee.preferred_skills?.split(',').map(s => s.trim()) || [];
    const industry_specific_needs = Array.isArray(mentee.industry_specific_needs) ? mentee.industry_specific_needs : mentee.industry_specific_needs?.split(',').map(s => s.trim()) || [];
    const interests = Array.isArray(mentee.interests) ? mentee.interests : mentee.interests?.split(',').map(s => s.trim()) || [];
  
    const hashedPassword = mentee.password ? await bcrypt.hash(mentee.password, 10) : await bcrypt.hash('password', 10);
  
    // Insert mentee into the database
    const res = await this.pool.query(
      `INSERT INTO users 
        (email, password, role, name, last_work_role, skills, location, mbti, experience, image_url, 
        max_match, interests, motivation, career_goals, preferred_skills, industry_specific_needs) 
      VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10, $11, $12::text[], $13, $14::text[], $15::text[], $16::text[]) 
      RETURNING *`,
      [
        mentee.email,
        hashedPassword,
        "mentee",
        mentee.name,
        mentee.lastWorkRole || null, // Default to null if lastWorkRole is not provided
        mentee.skills || [], // Ensure skills is an array
        mentee.location,
        mentee.mbti,
        mentee.experience,
        mentee.imageUrl || null, // Default to null if imageUrl is not provided
        mentee.maxMatch !== undefined ? mentee.maxMatch : 3, // Default maxMatch to 3
        interests, // Convert interests to array
        mentee.motivation || null, // Default to null if motivation is not provided
        career_goals, // Convert career_goals to array
        preferred_skills, // Convert preferred_skills to array
        industry_specific_needs // Convert industry_specific_needs to array
      ]
    );
  
    return res.rows[0];
  }
  

async deleteUsersByRole(role: string): Promise<void> {
  await this.pool.query(
    `DELETE FROM users WHERE role = $1`,
    [role]
  );
}

async getMatches(userId: number, role: 'mentor' | 'mentee'): Promise<Match[]> {
  const matchRoleColumn = role === 'mentor' ? 'mentor_id' : 'mentee_id';
  const oppositeRoleColumn = role === 'mentor' ? 'mentee_id' : 'mentor_id';

  const res = await this.pool.query(
    `SELECT 
      m.*, 
      u.name, 
      u.last_work_role, 
      u.industry_specific_needs, 
      u.experience, 
      u.skills, 
      u.location, 
      u.mbti 
    FROM 
      matches m
      JOIN users u ON u.id = m.${oppositeRoleColumn}
    WHERE 
      m.${matchRoleColumn} = $1`, 
    [userId]
  );

  return res.rows.map((match) => ({
    ...match
  }));
}


  async createMatch(mentorId: number, menteeId: number, score: number): Promise<Match> {
    const res = await this.pool.query(
      'INSERT INTO matches (mentor_id, mentee_id, score, accepted, seen) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [mentorId, menteeId, score, false, false]
    );
    return res.rows[0];
  }

  async deleteMatchesForUser(userId: number, role: 'mentee' | 'mentor'): Promise<void> {
    try {
      // Delete matches based on the user's role
      const column = role === 'mentee' ? 'mentee_id' : 'mentor_id';
  
      const res = await this.pool.query(
        `DELETE FROM matches WHERE ${column} = $1`,
        [userId]
      );
  
      console.log(`Deleted ${res.rowCount} matches for user ${userId} as ${role}`);
    } catch (error) {
      console.error("Error deleting matches:", error);
      throw new Error("Failed to delete matches");
    }
  }
  
  async updateMatch(id: number, update: Partial<Match>): Promise<Match> {
    const keys = Object.keys(update);
    const fields = keys.map((key, index) => `${key} = $${index + 2}`).join(", "); // Start index at 2 (since $1 is for id)
    const values = Object.values(update);
  
    const res = await this.pool.query(
      `UPDATE matches SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...values] // id goes first, followed by update values
    );
  
    return res.rows[0];
  }
  

  async getUserByRole(role: string): Promise<Array<Omit<User, "password">> | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE role = $1', [role]);
  
    return res.rows.map(({ password, ...user }) => user); // Remove password from each user object
  }
  

  async getMentorsForMentee(menteeId: number): Promise<Array<User & { matchScore: number }>> {
    const res = await this.pool.query(
      'SELECT users.*, matches.score FROM users JOIN matches ON users.id = matches.mentor_id WHERE matches.mentee_id = $1',
      [menteeId]
    );
    return res.rows;
  }

  async getScoreMentorsForMentee(menteeId: number): Promise<Array<User & { score: number, matchid: number }>> {
    const res = await this.pool.query(
      'SELECT users.*, matches.score AS matchScore, matches.id AS matchid FROM users JOIN matches ON matches.mentee_id = $1 AND users.id = matches.mentor_id',
      [menteeId]
    );
    return res.rows;
  }

  async getMenteesForMentor(mentorId: number): Promise<Array<User & { score: number, matchid: number }>> {
    const res = await this.pool.query(
      `SELECT users.*, matches.score AS matchScore, matches.id AS matchid
       FROM users
       JOIN matches ON matches.mentor_id = $1 AND users.id = matches.mentee_id
       WHERE matches.accepted = TRUE`,  // Ensure only accepted matches are returned
      [mentorId]
    );
    return res.rows;
  }
  

  async getMessages(userId: number, otherId: number): Promise<Message[]> {
    const res = await this.pool.query(
      'SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY timestamp ASC',
      [userId, otherId]
    );
    return res.rows;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const res = await this.pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content, timestamp, read) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [message.senderId, message.receiverId, message.content, new Date(), false]
    );
    return res.rows[0];
  }

  async markMessageAsRead(messageId: number): Promise<Message> {
    const res = await this.pool.query(
      'UPDATE messages SET read = TRUE WHERE id = $1 RETURNING *',
      [messageId]
    );
    return res.rows[0];
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const res = await this.pool.query(
      'SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND read = FALSE',
      [userId]
    );
    return parseInt(res.rows[0].count, 10);
  }
}

export const storage = new DbStorage();
