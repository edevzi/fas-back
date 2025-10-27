import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import server setup
import connectDatabase from './config/database.js';
import { createServer } from './index.js';

const app = createServer();
const port = process.env.PORT || 8080;

// Connect to database
connectDatabase();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    apiUrl: `https://api.faskids.shop`
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 FasKids Backend running on port ${port}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API URL: https://api.faskids.shop`);
  console.log(`🔧 Local API: http://localhost:${port}/api`);
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
