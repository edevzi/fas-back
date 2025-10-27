# 🚀 FasKids Backend - Render Deployment Guide

## ✅ **Ready for Render Deployment**

Your backend is now configured for Render.com deployment with Docker.

---

## 📁 **Files Created for Render**

### **1. Dockerfile**
- ✅ Multi-stage build with Node.js 22 Alpine
- ✅ Security: Non-root user
- ✅ Health check endpoint
- ✅ Production optimizations

### **2. .dockerignore**
- ✅ Excludes unnecessary files
- ✅ Reduces build time
- ✅ Smaller image size

### **3. Environment Files**
- ✅ `env.production.example` - Production template
- ✅ `render.env` - Render-specific config

---

## 🔧 **Render.com Setup Steps**

### **Step 1: Push to GitHub**
```bash
# Add all files
git add .
git commit -m "Add Docker configuration for Render deployment"
git push origin main
```

### **Step 2: Configure Render Service**

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Create New Web Service**
3. **Connect GitHub Repository**: `edevzi/fas-back`
4. **Configure Service**:
   - **Name**: `fas-back`
   - **Environment**: `Docker`
   - **Branch**: `main`
   - **Root Directory**: `/` (root)
   - **Dockerfile Path**: `Dockerfile`

### **Step 3: Environment Variables**

In Render dashboard, add these environment variables:

```bash
# Database
MONGODB_URI=mongodb+srv://edevzi:edevzi1234@cluster0.cwdvaas.mongodb.net/faskids?retryWrites=true&w=majority&appName=Cluster0

# Server
NODE_ENV=production
PORT=8080

# Domain
DOMAIN=faskids.shop
CLIENT_URL=https://faskids.shop

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# API
API_BASE_URL=https://fas-back.onrender.com/api
```

### **Step 4: Build Settings**

- **Build Command**: `pnpm run build:server`
- **Start Command**: `node dist/server/production.mjs`
- **Node Version**: `22`

---

## 🎯 **Deployment Process**

### **What Happens During Build**

1. **Docker Build**:
   ```dockerfile
   FROM node:22-alpine
   WORKDIR /app
   COPY package*.json pnpm-lock.yaml ./
   RUN npm install -g pnpm && pnpm install --frozen-lockfile
   COPY . .
   RUN pnpm run build:server
   ```

2. **Production Start**:
   ```bash
   node dist/server/production.mjs
   ```

3. **Health Check**:
   - Endpoint: `GET /api/ping`
   - Interval: 30 seconds

---

## 🔍 **Verification Steps**

### **After Deployment**

1. **Check Service URL**: `https://fas-back.onrender.com`
2. **Test API Endpoints**:
   ```bash
   # Health check
   curl https://fas-back.onrender.com/api/ping
   
   # Products
   curl https://fas-back.onrender.com/api/products
   
   # Categories
   curl https://fas-back.onrender.com/api/categories
   ```

3. **Check Logs**: In Render dashboard → Logs

---

## 🛠 **Troubleshooting**

### **Common Issues**

1. **Build Fails**:
   - Check Dockerfile syntax
   - Verify all dependencies in package.json
   - Check build logs in Render

2. **Runtime Errors**:
   - Verify environment variables
   - Check MongoDB connection
   - Review application logs

3. **Health Check Fails**:
   - Ensure `/api/ping` endpoint exists
   - Check server startup logs

### **Debug Commands**

```bash
# Check if service is running
curl -I https://fas-back.onrender.com/api/ping

# Test database connection
curl https://fas-back.onrender.com/api/products

# Check service logs in Render dashboard
```

---

## 📊 **Production Features**

### **Security**
- ✅ Non-root Docker user
- ✅ Environment variable protection
- ✅ CORS configuration
- ✅ Health checks

### **Performance**
- ✅ Alpine Linux (smaller image)
- ✅ Multi-stage build
- ✅ Production optimizations
- ✅ Proper caching

### **Monitoring**
- ✅ Health check endpoint
- ✅ Structured logging
- ✅ Error handling
- ✅ Graceful shutdown

---

## 🚀 **Next Steps**

1. **Deploy to Render**: Follow the setup steps above
2. **Update Frontend**: Point API calls to `https://fas-back.onrender.com/api`
3. **Test Everything**: Verify all endpoints work
4. **Monitor**: Check logs and performance

---

## 📝 **Environment Variables Summary**

| Variable | Value | Purpose |
|----------|-------|---------|
| `MONGODB_URI` | Your MongoDB Atlas connection | Database connection |
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `8080` | Server port |
| `DOMAIN` | `faskids.shop` | Your domain |
| `CLIENT_URL` | `https://faskids.shop` | Frontend URL |
| `JWT_SECRET` | Random string | JWT signing key |
| `API_BASE_URL` | `https://fas-back.onrender.com/api` | API base URL |

---

## ✅ **Status: Ready for Deployment**

Your backend is now fully configured for Render.com deployment with:
- ✅ Dockerfile
- ✅ Environment configuration
- ✅ Production optimizations
- ✅ Health checks
- ✅ Security measures

**Deploy now!** 🎉
