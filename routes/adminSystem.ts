import { RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/permissions";
import { AuditLog, getUserActivity, getSystemActivity } from "../models/AuditLog";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { Comment } from "../models/Comment";
import { logUserAction } from "../middleware/auditLogger";

// System Management Routes

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get system audit logs (Admin only)
 *     tags: [Admin]
 */
export const getAuditLogs: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const resource = req.query.resource as string;
    const action = req.query.action as string;
    const userRole = req.query.userRole as string;
    const userId = req.query.userId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const skip = (page - 1) * limit;

    let query: any = {};
    if (resource) query.resource = resource;
    if (action) query.action = action;
    if (userRole) query.userRole = userRole;
    if (userId) query.userId = userId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AuditLog.countDocuments(query);

    // Log action
    await logUserAction(req, 'read', 'audit_logs', undefined, {
      filters: { resource, action, userRole, userId },
      resultCount: logs.length
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Audit logs olishda xatolik:", error);
    res.status(500).json({
      success: false,
      message: "Audit logs olishda xatolik yuz berdi"
    });
  }
};

/**
 * @swagger
 * /api/admin/user/{userId}/activity:
 *   get:
 *     summary: Get specific user activity (Admin/Moderator)
 *     tags: [Admin]
 */
export const getUserActivityLogs: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const activity = await getUserActivity(userId, limit);
    
    // Foydalanuvchi ma'lumotini ham olish
    const user = await User.findById(userId).select('name phone role isActive');

    await logUserAction(req, 'read', 'user_activity', userId, {
      activityCount: activity.length
    });

    res.json({
      success: true,
      data: {
        user,
        activity
      }
    });
  } catch (error) {
    console.error("User activity olishda xatolik:", error);
    res.status(500).json({
      success: false,
      message: "User activity olishda xatolik yuz berdi"
    });
  }
};

/**
 * @swagger
 * /api/admin/dashboard/advanced:
 *   get:
 *     summary: Advanced admin dashboard statistics
 *     tags: [Admin]
 */
export const getAdvancedStats: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { period = '30d' } = req.query;
    let startDate = new Date();

    // Period asosida vaqt oralig'ini aniqlash
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const [
      userStats,
      orderStats,
      productStats,
      revenueStats,
      activityStats,
      topProducts,
      topCustomers,
      recentActivity
    ] = await Promise.all([
      // User statistics
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            newUsers: { $sum: 1 },
            activeUsers: { $sum: { $cond: ["$isActive", 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Order statistics
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { 
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              status: "$status"
            },
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" }
          }
        }
      ]),

      // Product statistics
      Product.aggregate([
        {
          $lookup: {
            from: 'orders',
            let: { productId: { $toString: "$_id" } },
            pipeline: [
              { $unwind: "$items" },
              { $match: { $expr: { $eq: ["$items.productId", "$$productId"] } } },
              { $match: { createdAt: { $gte: startDate } } }
            ],
            as: 'orderItems'
          }
        },
        {
          $project: {
            title: 1,
            price: 1,
            available: 1,
            salesCount: { $size: "$orderItems" },
            revenue: { 
              $sum: {
                $map: {
                  input: "$orderItems",
                  as: "item",
                  in: { $multiply: ["$$item.items.qty", "$$item.items.price"] }
                }
              }
            }
          }
        }
      ]),

      // Revenue statistics
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: "$totalAmount" }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Activity statistics
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: {
              action: "$action",
              resource: "$resource",
              userRole: "$userRole"
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),

      // Top products
      Product.aggregate([
        {
          $lookup: {
            from: 'orders',
            let: { productId: { $toString: "$_id" } },
            pipeline: [
              { $unwind: "$items" },
              { $match: { $expr: { $eq: ["$items.productId", "$$productId"] } } },
              { $match: { createdAt: { $gte: startDate } } }
            ],
            as: 'sales'
          }
        },
        {
          $project: {
            title: 1,
            price: 1,
            salesCount: { $size: "$sales" },
            revenue: { 
              $sum: {
                $map: {
                  input: "$sales",
                  as: "sale",
                  in: { $multiply: ["$$sale.items.qty", "$$sale.items.price"] }
                }
              }
            }
          }
        },
        { $sort: { salesCount: -1 } },
        { $limit: 10 }
      ]),

      // Top customers
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: "$userId",
            orderCount: { $sum: 1 },
            totalSpent: { $sum: "$totalAmount" }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            name: '$user.name',
            phone: '$user.phone',
            orderCount: 1,
            totalSpent: 1,
            avgOrderValue: { $divide: ['$totalSpent', '$orderCount'] }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 }
      ]),

      // Recent activity
      AuditLog.find({ timestamp: { $gte: startDate } })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean()
    ]);

    await logUserAction(req, 'read', 'advanced_stats', undefined, {
      period,
      dataPoints: {
        users: userStats.length,
        orders: orderStats.length,
        products: productStats.length
      }
    });

    res.json({
      success: true,
      data: {
        period,
        userStats,
        orderStats,
        productStats,
        revenueStats,
        activityStats,
        topProducts,
        topCustomers,
        recentActivity
      }
    });

  } catch (error) {
    console.error("Advanced stats olishda xatolik:", error);
    res.status(500).json({
      success: false,
      message: "Advanced statistics olishda xatolik yuz berdi"
    });
  }
};

/**
 * @swagger
 * /api/admin/system/health:
 *   get:
 *     summary: System health check (Admin only)
 *     tags: [Admin]
 */
export const getSystemHealth: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalComments,
      recentActivityCount
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Comment.countDocuments(),
      AuditLog.countDocuments({ timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ]);

    const systemHealth = {
      status: 'healthy',
      timestamp: new Date(),
      database: {
        connected: true,
        collections: {
          users: totalUsers,
          products: totalProducts,
          orders: totalOrders,
          comments: totalComments,
          auditLogs: await AuditLog.countDocuments()
        }
      },
      activity: {
        last24Hours: recentActivityCount
      },
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };

    await logUserAction(req, 'read', 'system_health');

    res.json({
      success: true,
      data: systemHealth
    });

  } catch (error) {
    console.error("System health check xatolik:", error);
    res.status(500).json({
      success: false,
      message: "System health check da xatolik yuz berdi"
    });
  }
};

/**
 * @swagger
 * /api/admin/users/{userId}/toggle-status:
 *   put:
 *     summary: Toggle user active/inactive status (Admin only)
 *     tags: [Admin]
 */
export const toggleUserStatus: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi"
      });
    }

    const oldStatus = user.isActive;
    user.isActive = !user.isActive;
    await user.save();

    await logUserAction(req, user.isActive ? 'activate' : 'deactivate', 'user', userId, {
      oldStatus,
      newStatus: user.isActive,
      targetUser: {
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });

    res.json({
      success: true,
      message: `Foydalanuvchi ${user.isActive ? 'faollashtirildi' : 'o\'chirildi'}`,
      data: {
        id: user.id,
        name: user.name,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error("User status o'zgartirishda xatolik:", error);
    res.status(500).json({
      success: false,
      message: "User status o'zgartirishda xatolik yuz berdi"
    });
  }
};

/**
 * @swagger
 * /api/admin/users/{userId}/change-role:
 *   put:
 *     summary: Change user role (Admin only)
 *     tags: [Admin]
 */
export const changeUserRole: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'moderator', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Noto'g'ri rol. Faqat 'admin', 'moderator' yoki 'user' bo'lishi mumkin"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi"
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logUserAction(req, 'change_role', 'user', userId, {
      oldRole,
      newRole: role,
      targetUser: {
        name: user.name,
        phone: user.phone
      }
    });

    res.json({
      success: true,
      message: `Foydalanuvchi roli ${oldRole} dan ${role} ga o'zgartirildi`,
      data: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error("User role o'zgartirishda xatolik:", error);
    res.status(500).json({
      success: false,
      message: "User role o'zgartirishda xatolik yuz berdi"
    });
  }
};