import * as jose from "jose";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: "access" | "refresh";
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<JwtPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jose.jwtVerify(token, key);

  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }

  return {
    sub: payload.sub as string,
    email: payload.email as string,
    role: payload.role as string,
    type: payload.type as "access",
  };
}
