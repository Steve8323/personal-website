# stevehou.com

Personal site — home, work, blog, readings, and a "grab lunch" form.

Built with Next.js (App Router), TypeScript, and Tailwind. Blog posts are
Markdown files; projects and readings are TypeScript data.

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in RESEND_API_KEY
npm run dev
```

Site runs at [http://localhost:3000](http://localhost:3000).

## Editing content

- **Blog post** — add a Markdown file in `content/blog/<slug>.md` with
  frontmatter:
  ```markdown
  ---
  title: "Post title"
  date: "2026-05-09"
  excerpt: "One-line summary (optional)."
  ---

  Post body in Markdown.
  ```
- **Projects** — edit `src/lib/projects.ts`.
- **Reading recommendations** — edit `src/lib/readings.ts`.
- **About / homepage copy** — edit `src/app/page.tsx`.

## Lunch form

Posts to `/api/lunch`, which uses [Resend](https://resend.com) to email
`contact.levu@proton.me`. Set `RESEND_API_KEY` in `.env.local` (locally) and in
Vercel's project env vars (production).

By default, mail is sent from `onboarding@resend.dev` (Resend's sandbox).
Sandbox messages can only be delivered to the email address that registered
the Resend account. Once you've verified your own sending domain in Resend,
set `LUNCH_FROM_EMAIL` to use it.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. In the project settings, add the environment variable `RESEND_API_KEY`.
4. Click Deploy.

Vercel auto-rebuilds on every push to `main`.
