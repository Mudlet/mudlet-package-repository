import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import FacebookProvider from "next-auth/providers/facebook"
import AppleProvider from "next-auth/providers/apple"
import MicrosoftProvider from "next-auth/providers/azure-ad"
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
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    // FacebookProvider({
    //   clientId: process.env.FACEBOOK_ID!,
    //   clientSecret: process.env.FACEBOOK_SECRET!,
    // }),
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
    }),    
    // MicrosoftProvider({
    //   clientId: process.env.MICROSOFT_ID!,
    //   clientSecret: process.env.MICROSOFT_SECRET!,
    // })
  ],
  /* only for development - fixing Apple login */
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
