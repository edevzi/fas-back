import express from "express";
import cors from "cors";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import connectDatabase from "./config/database";
import { getProducts, getProductBySlug } from "./routes/products";
import { getCategories, getCategoryBySlug } from "./routes/categories";
import { getProductComments, createComment, markHelpful } from "./routes/comments";
import { signup, login, me, requireAuth, requireRole } from "./routes/auth";
import { createOrder, getMyOrders, adminListOrders, updateOrderStatus } from "./routes/orders";

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
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
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
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

// Serve static files from dist/spa in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "../dist/spa");
  app.use(express.static(distPath));
  
  // Serve index.html for all routes in production (SPA)
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

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

// Auth
app.post("/api/auth/signup", signup);
app.post("/api/auth/login", login);
app.get("/api/auth/me", me);

// Orders
app.post("/api/orders", requireAuth, requireRole("user", "admin", "cashier"), createOrder);
app.get("/api/orders/my", requireAuth, requireRole("user", "admin", "cashier"), getMyOrders);
app.get("/api/orders", requireAuth, requireRole("admin", "cashier"), adminListOrders);
app.patch("/api/orders/:orderId/status", requireAuth, requireRole("admin", "cashier"), updateOrderStatus);

// Swagger JSON endpoint
app.get("/api-docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;

