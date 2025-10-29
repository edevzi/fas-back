import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import connectDatabase from "./config/database";
import { getProducts, getProductBySlug } from "./routes/products";
import { getCategories, getCategoryBySlug } from "./routes/categories";
import { getProductComments, createComment, markHelpful, getUserComments } from "./routes/comments";
import { signup, login, me, requireAuth, requireRole } from "./routes/auth";
import { createOrder, getMyOrders, adminListOrders, updateOrderStatus } from "./routes/orders";
import { getAllUsers, createUser, updateUser, deleteUser, getDashboardStats } from "./routes/admin";
import { createProduct, updateProduct, deleteProduct, createCategory, updateCategory, deleteCategory } from "./routes/adminProducts";
import { getAllOrders, assignCourier, calculateDelivery, trackOrder } from "./routes/delivery";
import { User } from "./models/User";

const app = express();

// Permissive CORS: allow all origins (reflect request origin) and credentials
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "FasKids API",
      version: "1.0.0",
      description: "API documentation for FasKids children's clothing e-commerce platform",
      contact: {
        name: "FasKids Support",
        email: "support@faskids.shop",
        url: "https://faskids.shop"
      },
      servers: [
        {
          url: "https://faskids.shop/api",
          description: "Production server"
        },
        {
          url: "http://localhost:8080/api",
          description: "Development server"
        }
      ]
    },
    components: {
      schemas: {
        Product: {
          type: "object",
          required: ["slug", "title", "gender", "ageRange", "categorySlug", "price", "available", "description", "material", "care"],
          properties: {
            id: { type: "string" },
            slug: { type: "string" },
            title: { type: "string" },
            gender: { type: "string", enum: ["boy", "girl", "unisex"] },
            ageRange: { type: "string", enum: ["0-3m", "3-6m", "6-12m", "1-3y", "3-5y", "5-7y", "7-10y"] },
            categorySlug: { type: "string" },
            price: { type: "number" },
            oldPrice: { type: "number" },
            colors: { type: "array", items: { type: "string" } },
            sizes: { type: "array", items: { type: "string" } },
            images: { type: "array", items: { type: "string" } },
            rating: { type: "number", minimum: 0, maximum: 5 },
            reviewCount: { type: "number" },
            available: { type: "boolean" },
            description: { type: "string" },
            material: { type: "string" },
            care: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            recommendedProducts: { type: "array", items: { type: "string" } },
            similarProducts: { type: "array", items: { type: "string" } }
          }
        },
        Category: {
          type: "object",
          required: ["slug", "title"],
          properties: {
            id: { type: "string" },
            slug: { type: "string" },
            title: { type: "string" },
            icon: { type: "string" }
          }
        },
        Comment: {
          type: "object",
          required: ["productId", "userId", "userName", "rating", "title", "content"],
          properties: {
            id: { type: "string" },
            productId: { type: "string" },
            userId: { type: "string" },
            userName: { type: "string" },
            userAvatar: { type: "string" },
            rating: { type: "number", minimum: 1, maximum: 5 },
            title: { type: "string" },
            content: { type: "string" },
            date: { type: "string" },
            verified: { type: "boolean" },
            helpful: { type: "number" },
            images: { type: "array", items: { type: "string" } },
            size: { type: "string" },
            color: { type: "string" }
          }
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" }
          }
        }
      }
    }
  },
  apis: ["./routes/*.ts", "./index.ts"]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Attempt to drop legacy unique email index if present (from older schema)
User.collection.indexes().then((idx) => {
  const hasEmail = idx.some((i: any) => i.name === 'email_1');
  if (hasEmail) {
    User.collection.dropIndex('email_1').catch(() => {});
  }
}).catch(() => {});

// Health check
app.get("/api/ping", (_req, res) => {
  res.json({ message: "pong", timestamp: new Date().toISOString() });
});

// API Routes
// Products
app.get("/api/products", getProducts);
app.get("/api/products/:slug", getProductBySlug);

// Categories
app.get("/api/categories", getCategories);
app.get("/api/categories/:slug", getCategoryBySlug);

// Comments
app.get("/api/products/:productId/comments", getProductComments);
app.post("/api/products/:productId/comments", createComment);
app.post("/api/comments/:commentId/helpful", markHelpful);
app.get("/api/users/:userId/comments", getUserComments);

// Auth
app.post("/api/auth/signup", signup);
// Auth
app.post("/api/auth/signup", signup);
app.post("/api/auth/login", login);
app.get("/api/auth/me", me);

// Orders
app.post("/api/orders", createOrder);
app.get("/api/orders/my", requireAuth, requireRole("user", "admin", "moderator"), getMyOrders);
app.get("/api/orders", requireAuth, requireRole("admin", "moderator"), adminListOrders);
app.patch("/api/orders/:orderId/status", requireAuth, requireRole("admin", "moderator"), updateOrderStatus);

// Shipping
import { getQuote } from "./routes/shipping";
app.get("/api/shipping/quote", getQuote);

// Payments
import { createPayme, createClick, paymeWebhook, clickWebhook, returnSuccess, returnFail } from "./routes/payments";
app.post("/api/payments/payme/create", createPayme);
app.post("/api/payments/click/create", createClick);
app.post("/api/payments/payme/webhook", paymeWebhook);
app.post("/api/payments/click/webhook", clickWebhook);
app.get("/api/payments/return/success", returnSuccess);
app.get("/api/payments/return/fail", returnFail);

// Admin Routes
app.get("/api/admin/stats", requireAuth, requireRole("admin", "moderator"), getDashboardStats);
app.get("/api/admin/users", requireAuth, requireRole("admin", "moderator"), getAllUsers);
app.post("/api/admin/users", requireAuth, requireRole("admin", "moderator"), createUser);
app.put("/api/admin/users/:id", requireAuth, requireRole("admin", "moderator"), updateUser);
app.delete("/api/admin/users/:id", requireAuth, requireRole("admin"), deleteUser);

// Admin Product/Category Management
app.post("/api/admin/products", requireAuth, requireRole("admin", "moderator"), createProduct);
app.put("/api/admin/products/:id", requireAuth, requireRole("admin", "moderator"), updateProduct);
app.delete("/api/admin/products/:id", requireAuth, requireRole("admin", "moderator"), deleteProduct);
app.post("/api/admin/categories", requireAuth, requireRole("admin", "moderator"), createCategory);
app.put("/api/admin/categories/:id", requireAuth, requireRole("admin", "moderator"), updateCategory);
app.delete("/api/admin/categories/:id", requireAuth, requireRole("admin", "moderator"), deleteCategory);

// Admin Order Management
app.get("/api/admin/orders", requireAuth, requireRole("admin", "moderator"), getAllOrders);
app.put("/api/admin/orders/:id/courier", requireAuth, requireRole("admin", "moderator"), assignCourier);

// Delivery & Tracking
app.post("/api/delivery/calculate", calculateDelivery);
app.get("/api/delivery/track/:orderId", trackOrder);

// Telegram notify
import { notifyTelegram } from "./routes/notify";
app.post("/api/notify/telegram", notifyTelegram);

// Swagger JSON endpoint
app.get("/api-docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

export function createServer() {
  // Connect to database
  connectDatabase();
  
  return app;
}

// Start server if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const PORT = process.env.PORT || 8080;
  
  connectDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    });
  }).catch(error => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });
}
