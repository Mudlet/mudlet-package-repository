This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Setup instructions
1. Copy `.env.local.example` to `.env.local`

2. Set up package upload permissions
   - Create a Personal Access Token (Classic) at GitHub.com → Settings → Developer Settings → Personal Access Tokens
   - Required scope: `repo` (for creating branches, uploading files, and creating PRs)
   - Save this token as `GITHUB_API_TOKEN` in `.env.local`:

3. Enable GitHub Login
   - Create OAuth App at GitHub Settings → Developer Settings → OAuth Apps
   - Set callback URL: `http://localhost:3000/api/auth/callback/github`
   - Save Client ID and Secret in `.env.local`:
     ```
     GITHUB_ID=your_client_id_here
     GITHUB_SECRET=your_client_secret_here
     ```

### Start Development
Run the development server


Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
