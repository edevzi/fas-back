import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import server setup
import connectDatabase from './config/database.js';
import { createServer } from './index.js';

const app = createServer();
const port = process.env.PORT || 8080;

// Connect to database
connectDatabase();

// In production, serve static files if needed
if (process.env.NODE_ENV === 'production') {
  // Serve any static files from public directory
  app.use(express.static(path.join(__dirname, 'public')));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 FasKids Backend running on port ${port}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
  console.log(`📊 Health: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});
