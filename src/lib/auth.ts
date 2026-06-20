import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  debug: process.env.NODE_ENV === "development",
  providers: [
    Twitter({
      clientId: process.env.X_CLIENT_ID!,
      clientSecret: process.env.X_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // Update tokens on EVERY sign-in (not just linkAccount).
      // Wrapped in try/catch because for brand-new users the account
      // record doesn't exist yet (PrismaAdapter creates it after signIn).
      if (account?.access_token || account?.refresh_token) {
        const updateData: {
          access_token?: string;
          refresh_token?: string;
          expires_at?: number;
        } = {};

        if (account.access_token) {
          updateData.access_token = encrypt(account.access_token);
        }
        if (account.refresh_token) {
          updateData.refresh_token = encrypt(account.refresh_token);
        }
        if (account.expires_at) {
          updateData.expires_at = account.expires_at;
        }

        try {
          await db.account.update({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            data: updateData,
          });
        } catch {
          // Account doesn't exist yet for new users — linkAccount will handle token encryption
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  events: {
    async linkAccount({ account }) {
      if (account.access_token || account.refresh_token) {
        await db.account.update({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          data: {
            access_token: account.access_token
              ? encrypt(account.access_token)
              : null,
            refresh_token: account.refresh_token
              ? encrypt(account.refresh_token)
              : null,
          },
        });
      }
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
  },
});
