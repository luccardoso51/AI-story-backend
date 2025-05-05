import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Usually I keep the token between 5 minutes - 15 minutes

function generateAccessToken(user: any) {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_ACCESS_SECRET as string,
    {
      expiresIn: '5m'
    }
  );
}

// Generate a random string as refreshToken
function generateRefreshToken() {
  const token = crypto.randomBytes(16).toString('base64url');
  return token;
}

function generateTokens(user: any) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  return { accessToken, refreshToken };
}

export { generateAccessToken, generateRefreshToken, generateTokens };
