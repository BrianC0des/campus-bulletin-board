# Deployment Archive

Configs removed for midterm demo (local only).
Restore these for FINALS deployment.

## To restore:

### 1. Vercel (Frontend)
cp vercel/vercel.json ../frontend/vercel.json

### 2. Render (Backend)
cp render/render.yaml ../render.yaml

### 3. api.js
In frontend/src/services/api.js, replace:
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
With:
  baseURL: import.meta.env.VITE_API_URL || 'https://campus-bulletin-backend.onrender.com/api',

### 4. Render Environment Variables
Set in Render dashboard:
  DATABASE_URL=<your plain postgres connection string>
  NODE_ENV=production
  PORT=5000
  CLIENT_URL=https://campus-bulletin-board.vercel.app
  CAMPUS_TIMEZONE=Asia/Manila

## URLs (when live)
  Frontend: https://campus-bulletin-board.vercel.app
  Backend:  https://campus-bulletin-backend.onrender.com
