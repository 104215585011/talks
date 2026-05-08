# LinguaAI

LinguaAI is an AI multilingual conversation learning system. This repository starts with
TICKET-001, TICKET-002, and TICKET-003: a Next.js 14 foundation, Prisma PostgreSQL schema,
and separated environment templates.

## Tech Stack

- Next.js 14 App Router
- React 18
- TypeScript strict mode
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Jest for database helper tests

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
copy .env.local.example .env.local
```

Update `.env.local` with real local values. API keys must stay in local environment files
or hosting-provider secrets. Do not commit `.env.local`, `.env.test`, or `.env.production`.

Start local PostgreSQL if you are using Docker:

```bash
docker compose up -d postgres
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Run database migration after PostgreSQL is available and `DATABASE_URL` points to it:

```bash
npm run prisma:migrate
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification Commands

```bash
npm run lint
npm run build
npm test
```

`npm test` currently covers the database repository CRUD helper behavior with mocked
Prisma delegates. The actual PostgreSQL migration requires a reachable database.

## Environment Files

| File                      | Purpose                     | Commit? |
| ------------------------- | --------------------------- | ------- |
| `.env.local.example`      | Local development template  | Yes     |
| `.env.test.example`       | Test environment template   | Yes     |
| `.env.production.example` | Production secrets template | Yes     |
| `.env.local`              | Real local secrets          | No      |
| `.env.test`               | Real test secrets           | No      |
| `.env.production`         | Real production secrets     | No      |

Required server-side variables:

- `DATABASE_URL`
- `CLAUDE_API_KEY`
- `ELEVENLABS_API_KEY`
- `JWT_SECRET`
- `MESSAGE_ENCRYPTION_KEY`

Client-visible variables:

- `NEXT_PUBLIC_APP_URL`

## Project Structure

```text
src/
+-- app/
+-- components/
+-- lib/
+-- types/
```

Prisma files live in `prisma/`. Team and QA-facing documents live in `docs/`.
