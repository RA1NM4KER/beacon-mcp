import { env } from "../utils/env.js";
import type { GoogleTokenResponse } from "../types/googleAuth.js";

export async function fetchGoogleAccessToken(): Promise<string> {
  if (
    !env.GMAIL_CLIENT_ID ||
    !env.GMAIL_CLIENT_SECRET ||
    !env.GMAIL_REFRESH_TOKEN
  ) {
    throw new Error("Google OAuth client credentials are not fully configured");
  }

  let response: Response;

  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        refresh_token: env.GMAIL_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Google OAuth token request failed: ${message}`, {
      cause: error,
    });
  }

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    const details =
      data.error_description ?? data.error ?? "Unknown Google OAuth error";
    throw new Error(
      `Google OAuth token request failed: ${response.status} ${details}`,
    );
  }

  return data.access_token;
}
