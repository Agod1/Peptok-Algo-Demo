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
  const skills = Array.isArray(mentor.skills) ? mentor.skills   : mentor.skills.split(',').map((s) => s.trim());

  const res = await this.pool.query(
    `INSERT INTO users 
      (email, password, role, name, last_work_role, skills, location, mbti, experience, image_url, 
      max_match, interests, motivation, career_goals, preferred_skills, industry_specific_needs) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
    RETURNING *`,
    [
      mentor.email,
      await bcrypt.hash(mentor.password, 10), // Hash password before storing
      "mentor",
      mentor.name,
      mentor.lastWorkRole,
      skills,
      mentor.location,
      mentor.mbti,
      mentor.experience,
      mentor.imageUrl,
      mentor.maxMatch || null, 
      mentor.interests || [],
      mentor.motivation || null,
      null, // Mentees-only fields
      null,
      null
    ]
  );
  return res.rows[0];
}

async createMentee(mentee: InsertMentee): Promise<User> {
  const preferredSkills = Array.isArray(mentee.preferredSkills) ? mentee.preferredSkills : mentee.preferredSkills.split(',').map((s) => s.trim());

  const res = await this.pool.query(
    `INSERT INTO users 
      (email, password, role, name, last_work_role, skills, location, mbti, experience, image_url, 
      max_match, interests, motivation, career_goals, preferred_skills, industry_specific_needs) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
    RETURNING *`,
    [
      mentee.email,
      await bcrypt.hash(mentee.password, 10), // Hash password
      "mentee",
      mentee.name,
      mentee.lastWorkRole,
      mentee.skills || [],
      mentee.location,
      mentee.mbti,
      mentee.experience,
      mentee.imageUrl,
      null, // Mentors-only fields
      null,
      null,
      mentee.careerGoals || null,
      preferredSkills,
      mentee.industrySpecificNeeds || null
    ]
  );
  return res.rows[0];
}


  async getMatches(userId: number, role: 'mentor' | 'mentee'): Promise<Match[]> {
    const res = await this.pool.query(
      'SELECT * FROM matches WHERE ' + (role === 'mentor' ? 'mentor_id' : 'mentee_id') + ' = $1',
      [userId]
    );
    return res.rows;
  }

  async createMatch(mentorId: number, menteeId: number, score: number): Promise<Match> {
    const res = await this.pool.query(
      'INSERT INTO matches (mentor_id, mentee_id, score, accepted, seen) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [mentorId, menteeId, score, false, false]
    );
    return res.rows[0];
  }

  async updateMatch(id: number, update: Partial<Match>): Promise<Match> {
    const fields = Object.keys(update).map((key) => `${key} = $${key}`).join(', ');
    const values = Object.values(update);
    const res = await this.pool.query(
      `UPDATE matches SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...values]
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
