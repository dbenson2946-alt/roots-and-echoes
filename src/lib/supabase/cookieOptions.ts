/**
 * Settings for the sign-in cookies. In production they are only ever sent
 * over https ("secure") and are not sent along with requests that start on
 * another site ("lax"). The browser needs to read this cookie too (uploads go
 * straight from the browser to storage), so it can't be marked HttpOnly.
 */
export const authCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
