import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import announcementRoutes from './routes/announcements.js';
import displayRoutes from './routes/displays.js';
import pairingRoutes from './routes/pairing.js';
import userRoutes from './routes/users.js';
import { errorHandler } from './middleware/errors.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// api routes
app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/displays', displayRoutes);
app.use('/api/pairing', pairingRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
