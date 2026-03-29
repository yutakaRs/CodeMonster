import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export interface TokenPayload extends JWTPayload {
  sub: string; // user id
  email: string;
  role: string;
  type: "access" | "refresh";
}

function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function generateAccessToken(
  userId: string,
  email: string,
  role: string,
  secret: string,
): Promise<string> {
  return new SignJWT({ email, role, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getSecretKey(secret));
}

export async function generateRefreshToken(
  userId: string,
  email: string,
  role: string,
  secret: string,
): Promise<string> {
  return new SignJWT({ email, role, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getSecretKey(secret));
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecretKey(secret));
  return payload as TokenPayload;
}
