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

    // Input validation
    if (!name || !phone || !password) {
      return res.status(400).json({ message: "Name, phone and password are required" });
    }
    if (String(name).trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Normalize phone to +998XXXXXXXXX and validate
    const phoneDigits = String(phone || "").replace(/[^0-9]/g, "");
    if (phoneDigits.length < 9) {
      return res.status(400).json({ message: "Invalid phone number. Must have at least 9 digits after 998" });
    }
    const normalized = phoneDigits.startsWith("998") ? phoneDigits : `998${phoneDigits}`;
    if (normalized.length !== 12) {
      return res.status(400).json({ message: "Invalid phone number format. Expected 12 digits (998 + 9 digits)" });
    }
    const phoneE164 = `+${normalized}`;
    const phoneRegex = /^\+998[0-9]{9}$/;
    if (!phoneRegex.test(phoneE164)) {
      return res.status(400).json({ message: "Invalid phone number format. Use +998XXXXXXXXX" });
    }

    // Check if user exists
    let existing;
    try {
      existing = await User.findOne({ phone: phoneE164 });
    } catch (dbErr: any) {
      console.error("Database error checking existing user:", dbErr);
      return res.status(500).json({ message: "Database connection error. Please try again." });
    }
    
    if (existing) {
      return res.status(409).json({ message: "User already exists with this phone number" });
    }

    // Hash password
    let hashed;
    try {
      hashed = await bcrypt.hash(password, 10);
    } catch (hashErr: any) {
      console.error("Password hashing error:", hashErr);
      return res.status(500).json({ message: "Server error during password encryption" });
    }

    // Create user
    try {
      const user = await User.create({ 
        name: String(name).trim(), 
        password: hashed, 
        phone: phoneE164, 
        role: role || "user" 
      });
      
      // Generate token
      let token;
      try {
        token = signToken({ id: user.id, role: user.role });
      } catch (tokenErr: any) {
        console.error("Token generation error:", tokenErr);
        return res.status(500).json({ message: "Server error during token generation" });
      }
      
      return res.status(201).json({ token, user: user.toJSON() });
    } catch (createErr: any) {
      // Handle duplicate key error for unique phone (race condition)
      if (createErr && createErr.code === 11000 && createErr.keyPattern && createErr.keyPattern.phone) {
        return res.status(409).json({ message: "User already exists with this phone number" });
      }
      // Handle validation errors
      if (createErr?.name === 'ValidationError') {
        const validationMsg = createErr.message || 'Invalid input data';
        return res.status(400).json({ message: validationMsg });
      }
      // Unexpected error
      console.error('Signup user creation error:', createErr);
      console.error('Error details:', {
        name: createErr?.name,
        code: createErr?.code,
        message: createErr?.message,
        stack: createErr?.stack
      });
      return res.status(500).json({ message: "Server error during user creation" });
    }
  } catch (error: any) {
    console.error("Signup unexpected error:", error);
    console.error("Error stack:", error?.stack);
    res.status(500).json({ message: "Internal server error" });
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

    // Normalize phone to +998XXXXXXXXX
    const phoneDigits = String(phone || "").replace(/[^0-9]/g, "");
    const normalized = phoneDigits.startsWith("998") ? phoneDigits : `998${phoneDigits}`;
    const phoneE164 = `+${normalized.slice(0, 12)}`;
    const phoneRegex = /^\+998[0-9]{9}$/;
    if (!phoneRegex.test(phoneE164)) {
      return res.status(400).json({ message: "Invalid phone number format. Use +998XXXXXXXXX" });
    }
    if (!phoneE164 || !password) {
      return res.status(400).json({ message: "Phone and password are required" });
    }

    const user = await User.findOne({ phone: phoneE164 });
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


