import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import FacebookProvider from "next-auth/providers/facebook"
import AppleProvider from "next-auth/providers/apple"
import MicrosoftProvider from "next-auth/providers/azure-ad"

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID!,
      clientSecret: process.env.FACEBOOK_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
    MicrosoftProvider({
      clientId: process.env.MICROSOFT_ID!,
      clientSecret: process.env.MICROSOFT_SECRET!,
    })
  ],
})

export { handler as GET, handler as POST }
