import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

router.post('/login', async (req, res, next) => {
  // TODO
});

router.post('/logout', (req, res) => {
  // TODO
});

export default router;
