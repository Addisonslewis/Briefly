import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

interface RefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Refreshes an expired Twitter OAuth 2.0 access token using the refresh token.
 * Updates the database with the new tokens.
 */
export async function refreshTwitterToken(
  userId: string
): Promise<string | null> {
  try {
    // Get the account with refresh token
    const account = await db.account.findFirst({
      where: {
        userId,
        provider: "twitter",
      },
    });

    if (!account?.refresh_token) {
      console.error(`No refresh token found for user ${userId}`);
      return null;
    }

    const refreshToken = decrypt(account.refresh_token);

    // Twitter OAuth 2.0 token refresh endpoint
    const credentials = Buffer.from(
      `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Token refresh failed: ${response.status} ${error}`);
      return null;
    }

    const data: RefreshTokenResponse = await response.json();

    // Update the database with new tokens
    await db.account.update({
      where: {
        provider_providerAccountId: {
          provider: "twitter",
          providerAccountId: account.providerAccountId,
        },
      },
      data: {
        access_token: encrypt(data.access_token),
        refresh_token: data.refresh_token
          ? encrypt(data.refresh_token)
          : account.refresh_token, // Keep old refresh token if new one not provided
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      },
    });

    console.log(`Successfully refreshed token for user ${userId}`);
    return data.access_token;
  } catch (error) {
    console.error(`Error refreshing token for user ${userId}:`, error);
    return null;
  }
}
