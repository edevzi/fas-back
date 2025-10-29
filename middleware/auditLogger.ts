import { Request, Response, NextFunction } from "express";
import { logAction } from "../models/AuditLog";
import { AuthenticatedRequest } from "./permissions";

// Audit log middleware
export const auditLogger = (resource: string, action?: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    const startTime = Date.now();

    // Response ni capture qilish uchun
    res.json = function(body: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Audit log yozish
      if (req.user && req.user.id) {
        const logData = {
          userId: req.user.id,
          userName: req.user.name || 'Unknown',
          userRole: req.user.role || 'unknown',
          action: action || req.method.toLowerCase(),
          resource: resource,
          resourceId: req.params.id || req.params.userId || req.params.productId || req.body.id,
          details: {
            method: req.method,
            url: req.originalUrl,
            params: req.params,
            query: req.query,
            // Body ni log qilish (parollarni o'chirib)
            body: sanitizeBody(req.body),
            responseTime: responseTime,
            statusCode: res.statusCode
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          success: res.statusCode < 400,
          errorMessage: res.statusCode >= 400 ? body.message || 'Unknown error' : undefined
        };

        // Async log qilish (response ni kechiktirmaslik uchun)
        logAction(logData).catch(console.error);
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

// Sensitive ma'lumotlarni o'chirish
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'confirmPassword', 'oldPassword', 'newPassword', 'token', 'secret'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Qisqa audit log uchun helper
export const logUserAction = async (
  req: AuthenticatedRequest,
  action: string,
  resource: string,
  resourceId?: string,
  additionalDetails: Record<string, any> = {}
) => {
  if (!req.user) return;

  await logAction({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    action,
    resource,
    resourceId,
    details: {
      ...additionalDetails,
      url: req.originalUrl,
      method: req.method
    },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });
};