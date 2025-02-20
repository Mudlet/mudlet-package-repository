import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import AppleProvider from "next-auth/providers/apple"
import GoogleProvider from "next-auth/providers/google"
import GitLabProvider from "next-auth/providers/gitlab"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    ...(process.env.NODE_ENV === 'development' ? [
      CredentialsProvider({
        name: "Development Login",
        credentials: {},
        async authorize() {
          return {
            id: "dev-user",
            name: "Development User",
            email: "dev@example.com",
          }
        },
      })
    ] : []),
    GitLabProvider({
      clientId: process.env.GITLAB_ID!,
      clientSecret: process.env.GITLAB_SECRET!,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name?.firstName 
            ? `${profile.name.firstName} ${profile.name.lastName}`
            : profile.email?.split('@')[0],
          email: profile.email,
        }
      },
    })
  ],
  /* necessary for apple login */
  cookies: {
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
  },
})

export { handler as GET, handler as POST }
