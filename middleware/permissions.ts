import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: "admin" | "moderator" | "user";
    name: string;
    phone: string;
  };
}

// JWT token ni tekshirish middleware
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Admin rolini tekshirish
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Admin yoki Moderator rolini tekshirish
export const requireAdminOrModerator = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'moderator')) {
    return res.status(403).json({ message: 'Admin or Moderator access required' });
  }
  next();
};

// Faqat o'z resurslariga ruxsat (user uchun)
export const requireOwnershipOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const targetUserId = req.params.userId || req.body.userId;
  
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Admin va moderator barcha foydalanuvchi ma'lumotlariga ruxsat
  if (req.user.role === 'admin' || req.user.role === 'moderator') {
    return next();
  }

  // Oddiy user faqat o'z ma'lumotlariga ruxsat
  if (req.user.id === targetUserId) {
    return next();
  }

  return res.status(403).json({ message: 'Access denied' });
};

// Rol asosli ruxsatlar
export const PERMISSIONS = {
  // Admin permissions (to'liq ruxsat)
  ADMIN: {
    users: ['create', 'read', 'update', 'delete', 'list'],
    products: ['create', 'read', 'update', 'delete', 'list'],
    categories: ['create', 'read', 'update', 'delete', 'list'],
    orders: ['create', 'read', 'update', 'delete', 'list', 'manage'],
    comments: ['create', 'read', 'update', 'delete', 'moderate'],
    analytics: ['view', 'export'],
    system: ['settings', 'logs', 'backup'],
    delivery: ['manage', 'assign', 'track']
  },

  // Moderator permissions (cheklangan)
  MODERATOR: {
    users: ['read', 'list'], // faqat ko'rish
    products: ['create', 'read', 'update', 'list'], // o'chirish yo'q
    categories: ['read', 'list'], // faqat ko'rish
    orders: ['read', 'update', 'list', 'manage'], // o'chirish yo'q
    comments: ['read', 'update', 'delete', 'moderate'], // moderatsiya
    analytics: ['view'], // eksport yo'q
    delivery: ['manage', 'assign', 'track']
  },

  // User permissions (minimal)
  USER: {
    users: [], // faqat o'z profilini
    products: ['read', 'list'], // faqat ko'rish
    categories: ['read', 'list'],
    orders: [], // faqat o'z buyurtmalarini
    comments: ['create', 'read', 'update'], // faqat o'z izohlarini
    analytics: [],
    delivery: ['track'] // faqat o'z buyurtmasini kuzatish
  }
} as const;

// Muayyan amalni bajarish uchun ruxsat tekshirish
export const checkPermission = (resource: keyof typeof PERMISSIONS.ADMIN, action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.role.toUpperCase() as keyof typeof PERMISSIONS;
    const permissions = PERMISSIONS[userRole] as any;

    if (!permissions || !permissions[resource] || !permissions[resource].includes(action)) {
      return res.status(403).json({ 
        message: `Access denied: ${action} permission required for ${resource}`,
        userRole: req.user.role,
        requiredPermission: `${resource}:${action}`
      });
    }

    next();
  };
};