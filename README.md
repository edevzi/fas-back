# 🚀 FasKids Backend Server

Backend API server for FasKids e-commerce platform.

## 🏗️ **Quick Start**

### **Local Development**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Seed database
npm run seed
```

### **Production Build**
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🐳 **Docker Deployment**

### **Build Docker Image**
```bash
docker build -t faskids-backend .
```

### **Run Container**
```bash
docker run -p 8080:8080 \
  -e MONGODB_URI="your-mongodb-uri" \
  -e NODE_ENV=production \
  faskids-backend
```

## 🌐 **Render.com Deployment**

1. **Connect GitHub Repository**: `edevzi/fas-back`
2. **Set Environment**: Docker
3. **Add Environment Variables**:
   ```bash
   MONGODB_URI=mongodb+srv://edevzi:edevzi1234@cluster0.cwdvaas.mongodb.net/faskids?retryWrites=true&w=majority&appName=Cluster0
   NODE_ENV=production
   PORT=8080
   DOMAIN=faskids.shop
   CLIENT_URL=https://faskids.shop
   JWT_SECRET=your-super-secret-jwt-key
   ```

## 📡 **API Endpoints**

### **Health Check**
- `GET /health` - Server health status
- `GET /api/ping` - API health check

### **Products**
- `GET /api/products` - List all products
- `GET /api/products/:slug` - Get product by slug

### **Categories**
- `GET /api/categories` - List all categories
- `GET /api/categories/:slug` - Get category by slug

### **Comments**
- `GET /api/products/:id/comments` - Get product comments
- `POST /api/products/:id/comments` - Create comment
- `POST /api/comments/:id/helpful` - Mark comment as helpful

## 🔧 **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | Required |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `8080` |
| `DOMAIN` | Your domain | `faskids.shop` |
| `CLIENT_URL` | Frontend URL | `http://localhost:5173` |
| `JWT_SECRET` | JWT signing key | Required |

## 📊 **Database Models**

- **Product** - Product information
- **Category** - Product categories
- **Comment** - Product reviews/comments
- **User** - User accounts
- **Order** - Order information

## 🛠️ **Development**

### **Project Structure**
```
server/
├── config/          # Database configuration
├── models/          # Mongoose models
├── routes/          # API route handlers
├── scripts/         # Database seeding
├── Dockerfile       # Docker configuration
├── package.json     # Dependencies
└── production.ts    # Production entry point
```

### **Available Scripts**
- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm run seed` - Seed database

## 🚀 **Deployment Status**

✅ **Ready for Render.com deployment**
- Dockerfile configured
- Environment variables set
- Health checks implemented
- Production optimizations applied

**Deploy now!** 🎉
