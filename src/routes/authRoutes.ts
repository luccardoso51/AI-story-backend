import { Router } from 'express';
import {
  findUserByEmail,
  createUserByEmailAndPassword
} from '../services/userServices';
import { addRefreshTokenToWhitelist } from '../services/authServices';
import { generateTokens } from '../utils/jwt';

const router = Router();

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

export default router;
