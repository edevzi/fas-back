import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  id: string;
  userId: string; // Kim amal qilgan
  userName: string; // Foydalanuvchi nomi
  userRole: "admin" | "moderator" | "user";
  action: string; // "create", "update", "delete", "login", "logout"
  resource: string; // "user", "product", "order", "category"
  resourceId?: string; // Qaysi obyekt ustida amal
  details: Record<string, any>; // Amal haqida batafsil ma'lumot
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: String,
    required: true,
    ref: "User"
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ["admin", "moderator", "user"],
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // User actions
      "login", "logout", "register", "profile_update",
      
      // CRUD actions
      "create", "read", "update", "delete", "list",
      
      // Special actions
      "approve", "reject", "moderate", "assign", "unassign",
      "activate", "deactivate", "reset_password", "change_role",
      
      // Order actions
      "order_create", "order_update", "order_cancel", "order_deliver",
      
      // System actions
      "backup", "restore", "system_config"
    ]
  },
  resource: {
    type: String,
    required: true,
    enum: [
      "user", "product", "category", "order", "comment", 
      "delivery", "payment", "coupon", "analytics", "system"
    ]
  },
  resourceId: {
    type: String,
    required: false
  },
  details: {
    type: Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  collection: 'auditlogs'
});

// Indexlar
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, action: 1 });
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ userRole: 1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

// Audit log yozish uchun helper funksiya
export const logAction = async (logData: {
  userId: string;
  userName: string;
  userRole: "admin" | "moderator" | "user";
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}) => {
  try {
    const auditLog = new AuditLog({
      ...logData,
      timestamp: new Date()
    });
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error("Audit log yozishda xatolik:", error);
  }
};

// Ma'lum foydalanuvchi faoliyatini olish
export const getUserActivity = async (userId: string, limit: number = 50) => {
  return await AuditLog.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Tizim faoliyatini olish
export const getSystemActivity = async (
  filters: {
    resource?: string;
    action?: string;
    userRole?: string;
    startDate?: Date;
    endDate?: Date;
  } = {},
  limit: number = 100
) => {
  const query: any = {};
  
  if (filters.resource) query.resource = filters.resource;
  if (filters.action) query.action = filters.action;
  if (filters.userRole) query.userRole = filters.userRole;
  
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = filters.startDate;
    if (filters.endDate) query.timestamp.$lte = filters.endDate;
  }

  return await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};