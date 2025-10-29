import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function signToken(payload: object) {
  // No expiration as requested
  return jwt.sign(payload, JWT_SECRET);
}

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, password]
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *                 description: "+998XXXXXXXXX format"
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, cashier, user]
 *     responses:
 *       201:
 *         description: Registered successfully
 *       409:
 *         description: User already exists
 */
export const signup: RequestHandler = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body || {};

    if (!name || !phone || !password) {
      return res.status(400).json({ message: "Name, phone and password are required" });
    }

    // Check if phone is valid
    const phoneRegex = /^\+?998[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number format. Use +998XXXXXXXXX" });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ message: "User already exists with this phone number" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, password: hashed, phone, role });

    const token = signToken({ id: user.id, role: user.role });
    res.status(201).json({ token, user: user.toJSON() });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with phone and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password]
 *             properties:
 *               phone:
 *                 type: string
 *                 description: "+998XXXXXXXXX format"
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login success
 *       401:
 *         description: Invalid credentials
 */
export const login: RequestHandler = async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required" });
    }

    // Check if phone is valid
    const phoneRegex = /^\+?998[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number format. Use +998XXXXXXXXX" });
    }
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required" });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, role: user.role });
    res.json({ token, user: user.toJSON() });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *       401:
 *         description: Missing or invalid token
 */
export const me: RequestHandler = async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing token" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ user: user.toJSON() });
    } catch {
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (error) {
    console.error("Me error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const requireAuth: RequestHandler = (req, res, next) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export function requireRole(...roles: Array<"admin" | "cashier" | "user">): RequestHandler {
  return (req, res, next) => {
    const current = (req as any).user as { role?: string } | undefined;
    if (!current?.role) return res.status(403).json({ message: "Forbidden" });
    if (!roles.includes(current.role as any)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}


