import { Router } from 'express';
import {
  findUserByEmail,
  createUserByEmailAndPassword,
  findUserById
} from '../services/userServices';
import {
  addRefreshTokenToWhitelist,
  deleteRefreshTokenById,
  findRefreshToken,
  revokeTokens
} from '../services/authServices';
import { generateTokens } from '../utils/jwt';
import bcrypt from 'bcrypt';
const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Auth'
 *       400:
 *         description: User already exists or missing required fields
 *       500:
 *         description: Server error
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400);
      throw new Error('You must provide an email, password, and name.');
    }
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      res.status(400);
      throw new Error('User already exists.');
    }

    const user = await createUserByEmailAndPassword({ email, password, name });
    const { accessToken, refreshToken } = generateTokens(user);
    await addRefreshTokenToWhitelist({ refreshToken, userId: user.id });

    res.status(201).json({
      accessToken,
      refreshToken
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Error registering user',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Auth'
 *       400:
 *         description: User does not exist or missing fields
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('You must provide an email and password.');
    }

    const existingUser = await findUserByEmail(email);

    if (!existingUser) {
      res.status(400);
      throw new Error('User does not exist.');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordValid) {
      res.status(401);
      throw new Error('Invalid credentials.');
    }

    const { accessToken, refreshToken } = generateTokens(existingUser);
    await addRefreshTokenToWhitelist({ refreshToken, userId: existingUser.id });

    res.status(200).json({
      accessToken,
      refreshToken
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Error logging in',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Auth'
 *       400:
 *         description: Missing refresh token
 *       401:
 *         description: Invalid or expired refresh token
 *       500:
 *         description: Server error
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400);
      throw new Error('You must provide a refresh token.');
    }

    const savedRefreshToken = await findRefreshToken(refreshToken);

    if (
      (!savedRefreshToken || savedRefreshToken.isValid === false,
      !!Date.now() >= savedRefreshToken.expiresAt.getTime())
    ) {
      res.status(401);
      throw new Error('Unauthorized');
    }

    const user = await findUserById(savedRefreshToken.userId);

    if (!user) {
      res.status(401);
      throw new Error('Unauthorized');
    }

    await deleteRefreshTokenById(savedRefreshToken.id);

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    await addRefreshTokenToWhitelist({
      refreshToken: newRefreshToken,
      userId: user.id
    });

    res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Error refreshing token',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /auth/revoke-refresh-tokens:
 *   post:
 *     summary: Revoke all refresh tokens for a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Tokens revoked successfully
 *       500:
 *         description: Server error
 */
router.post('/revoke-refresh-tokens', async (req, res) => {
  try {
    const { userId } = req.body;
    await revokeTokens(userId);
    res.json({ message: `Tokens revoked for user with id #${userId}` });
  } catch (error: any) {
    res.status(500).json({
      message: 'Error revoking tokens',
      error: error.message
    });
  }
});

export default router;
