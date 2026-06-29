# 📦 DevStash

> One fast, searchable, AI-enhanced hub for all your developer knowledge & resources.

DevStash is a developer knowledge hub for snippets, commands, prompts, notes, files, images, links, and custom types. It solves the problem of developer essentials being scattered across VS Code, Notion, browser bookmarks, AI chats, and random folders by giving everything a single, fast home.

See [context/project-overview.md](context/project-overview.md) for the full product spec.

## ✨ Features

- **Items & Item Types** — every saved resource is an Item with a type (Snippet, Prompt, Command, Note, Link, File, Image) that controls how it behaves and displays. Custom types are a planned Pro feature.
- **Collections** — named groups that can hold items of any type; an item can live in multiple collections.
- **Search** — across content, tags, titles, and types.
- **Auth** — email/password and GitHub OAuth via NextAuth v5.
- **Quality of life** — favorites, pinning, recently used, markdown editing, file uploads, export, and dark mode by default.
- **AI (Pro)** — auto-tag suggestions, summaries, "explain this code", and a prompt optimizer powered by OpenAI.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 + React 19 + TypeScript
- **Database:** Neon (PostgreSQL) with Prisma 7 ORM
- **Auth:** NextAuth v5
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **File storage:** Cloudflare R2
- **AI:** OpenAI (`gpt-5-nano`)
- **Payments:** Stripe (subscriptions)

## 🚀 Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

You'll need a `.env` file with your database connection (and other service credentials as features come online). After setting `DATABASE_URL`, apply migrations and seed demo data:

```bash
npm run db:migrate   # apply migrations in dev
npm run db:seed      # seed system item types + demo data
```

## 📜 Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint via flat config |
| `npm run db:migrate` | Apply Prisma migrations in dev |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:status` | Check migration sync status |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:test` | Run the database smoke test |

## 🗄️ Database

DevStash uses Prisma with Neon PostgreSQL. **All schema changes go through `prisma migrate`** — never `prisma db push` or direct DB edits. Run migrations in dev first, then in production.

## 📁 Project Structure

- `src/app/` — Next.js routes (App Router)
- `src/components/[feature]/` — React components
- `src/actions/[feature].ts` — Server Actions
- `src/lib/` — utilities and DB access helpers
- `src/types/[feature].ts` — shared types
- `prisma/` — schema, migrations, and seed
- `context/` — project specs and coding standards

## 💰 Monetization

Freemium model: a free tier (50 items, 3 collections, no file/image uploads or AI) and a Pro tier ($8/month or $72/year) that unlocks unlimited items/collections, file & image uploads, AI features, and data export. During development all features are available to all users.
