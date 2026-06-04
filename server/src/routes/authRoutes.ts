import { Router } from 'express';
import { getSession, login, logout } from '../controllers/authController';
import { authenticateJwt } from '../middleware/authenticateJwt';

const authRoutes = Router();
authRoutes.post('/login', login);
authRoutes.post('/logout', logout);
authRoutes.get('/me', authenticateJwt, getSession);

export default authRoutes;
