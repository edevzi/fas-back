import { RequestHandler } from "express";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { Comment } from "../models/Comment";
import { AuditLog, logAction } from "../models/AuditLog";
import { AuthenticatedRequest, checkPermission } from "../middleware/permissions";
import { auditLogger, logUserAction } from "../middleware/auditLogger";
import bcrypt from "bcryptjs";

// User Management Routes

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, moderator, user]
 *     responses:
 *       200:
 *         description: List of users
 */
export const getAllUsers: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as string;
    const search = req.query.search as string;
    const isActive = req.query.isActive as string;
    const skip = (page - 1) * limit;

    let query: any = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create new user (Admin/Moderator)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, user]
 *     responses:
 *       201:
 *         description: User created
 */
export const createUser: RequestHandler = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;
    const currentUser = (req as any).user;

    // Check permissions
    if (role === 'admin' && currentUser.role !== 'admin') {
      return res.status(403).json({ message: "Only admin can create admin accounts" });
    }

    if (role === 'moderator' && currentUser.role !== 'admin') {
      return res.status(403).json({ message: "Only admin can create moderator accounts" });
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      phone,
      password: hashedPassword,
      role,
      createdBy: currentUser.id
    });

    await user.save();

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated
 */
export const updateUser: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, isActive } = req.body;
    const currentUser = (req as any).user;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check permissions
    if (role === 'admin' && currentUser.role !== 'admin') {
      return res.status(403).json({ message: "Only admin can modify admin accounts" });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    res.json({
      message: "User updated successfully",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
export const deleteUser: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deletion of admin by non-admin
    if (user.role === 'admin' && currentUser.role !== 'admin') {
      return res.status(403).json({ message: "Only admin can delete admin accounts" });
    }

    // Prevent self-deletion
    if (user.id === currentUser.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Dashboard Stats

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin dashboard stats
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
export const getDashboardStats: RequestHandler = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalComments,
      recentOrders,
      ordersByStatus
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Comment.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).lean(),
      Order.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

    // Calculate revenue (mock calculation)
    const totalRevenue = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $group: { _id: null, total: { $sum: "$totals.total" } } }
    ]);

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalComments,
      totalRevenue: totalRevenue[0]?.total || 0,
      recentOrders,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};