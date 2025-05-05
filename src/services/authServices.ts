import { db } from '../utils/db';
import { hashToken } from '../utils/hashToken';

// used when we create a refresh token.
// a refresh token is valid for 30 days
// that means that if a user is inactive for more than 30 days, he will be required to log in again
function addRefreshTokenToWhitelist({
  refreshToken,
  userId
}: {
  refreshToken: string;
  userId: string;
}) {
  return db.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
    }
  });
}

// used to check if the token sent by the client is in the database.
function findRefreshToken(token: string) {
  return db.refreshToken.findUnique({
    where: {
      token: hashToken(token)
    }
  });
}

// soft delete tokens after usage.
function deleteRefreshTokenById(id: string) {
  return db.refreshToken.update({
    where: {
      id
    },
    data: {
      isValid: false
    }
  });
}

function revokeTokens(userId: string) {
  return db.refreshToken.updateMany({
    where: {
      userId
    },
    data: {
      isValid: false
    }
  });
}

export {
  addRefreshTokenToWhitelist,
  findRefreshToken,
  deleteRefreshTokenById,
  revokeTokens
};
