This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

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

## Deploy on the VPS (Docker + nginx)

The app runs as a Next.js standalone server in Docker on `127.0.0.1:3000`, behind nginx at
**https://rajapisangnugget.com** (`www` redirects to it); the backend is **https://api.rajapisangnugget.com**. The nginx
site, certificates and the full "new VPS" runbook live in the **setupvps** repo.

```bash
git clone <repo> ~/rpn-frontend && cd ~/rpn-frontend
cp .env.docker.example .env        # fill in; NEXT_PUBLIC_* are baked in at build time
docker compose up -d --build       # after every git pull or .env change
```

Moving the domain also needs, outside this repo:

- **Backend** (`rpn-backend/.env`): `DOCKER_FRONTEND_URL=https://rajapisangnugget.com` (DOKU return
  page, WhatsApp links) and add it to `DOCKER_CORS_ORIGINS`; then `docker compose up -d`.
- **Supabase** → Authentication → URL Configuration: Site URL + redirect URL
  `https://rajapisangnugget.com/auth/callback` (admin login).
- **Google Cloud** → API key → Website restrictions: `https://rajapisangnugget.com/*`.
- **DOKU** notification URL: `https://api.rajapisangnugget.com/api/payments/doku/notification`.
- **DNS**: `rajapisangnugget.com`, `www` and `api` → the VPS IP.
