# LinguaAI Technical Standards

This document defines the shared engineering rules for Claude1, Codex1, and Codex2 during
Sprint delivery.

## Branch Strategy

| Branch                       | Purpose                   | Rules                                                        |
| ---------------------------- | ------------------------- | ------------------------------------------------------------ |
| `main`                       | Production-ready code     | Protected; merge only after CI passes and review is complete |
| `dev`                        | Sprint integration branch | Feature branches merge here first for QA integration         |
| `feature/<ticket-id>-<slug>` | New feature work          | Branch from `dev`; one ticket per branch                     |
| `fix/<ticket-id>-<slug>`     | Bug fixes                 | Branch from `dev` or `main` depending on severity            |
| `chore/<slug>`               | Tooling and maintenance   | Use for non-feature project work                             |

Recommended flow:

```text
dev -> feature/TICKET-001-project-scaffold -> pull request -> dev -> main
```

## Commit Message Standard

Use Conventional Commits:

```text
feat: add character selection page
fix: handle chat stream timeout
style: polish glass message bubble
refactor: extract chat message repository
test: add message repository CRUD tests
docs: document environment setup
chore: update CI workflow
```

Rules:

- Start with one of `feat`, `fix`, `style`, `refactor`, `test`, `docs`, or `chore`.
- Keep the subject under 72 characters when practical.
- Reference the ticket in the body when the change is tied to a specific ticket.
- Do not mix unrelated tickets in one commit.

## API Naming Rules

- Use kebab-case paths: `/api/chat/message`, `/api/user/stats`.
- Use plural nouns for collections: `/api/characters`, `/api/sessions`.
- Use HTTP methods by behavior:
  - `GET` reads data.
  - `POST` creates data or starts actions.
  - `PATCH` updates partial data.
  - `DELETE` removes or archives data.
- Return JSON errors in this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Message content is required"
  }
}
```

- Auth-required endpoints must return `401` when missing credentials and `403` for valid
  credentials without permission.

## Frontend Naming Rules

- Components use PascalCase: `CharacterCard.tsx`.
- Hooks use the `use` prefix: `useChatStream.ts`.
- Utilities use camelCase: `formatMessage.ts`.
- Constants use UPPER_SNAKE_CASE: `MAX_MESSAGE_LENGTH`.
- Test IDs use kebab-case and describe intent: `message-input`, `character-emma`.
- Keep shared UI primitives in `src/components/ui`.
- Keep route-specific components near the feature folder when they are not shared.

## Code Review Checklist

Before requesting review:

- [ ] Ticket acceptance criteria are implemented.
- [ ] `npm run lint` passes.
- [ ] `npm run format` passes.
- [ ] `npx tsc --noEmit --incremental false` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes for frontend changes.
- [ ] Prisma schema changes include a migration and ERD update.
- [ ] API routes include validation and error responses.
- [ ] Async UI states include loading, error, and empty states.
- [ ] No real API keys, passwords, or local `.env.*` files are committed.
- [ ] No debug `console.log` statements remain.
- [ ] New behavior has tests or a documented QA reason for deferral.

## Pull Request Checklist

Each PR description should include:

```text
Ticket:
Summary:
Pages/API touched:
Database changes:
Self-test:
Known risks:
QA focus:
```

## Codex1 to Codex2 Handoff

Codex1 should hand off completed work in this format:

```text
Testing handoff - TICKET-XXX

Completed:
Pages/API:
Changed files:
Database changes:
Self-test results:
Known issues:
QA focus:
```

Codex2 should return:

```text
QA report - TICKET-XXX

Execution:
Pass/fail summary:
Bugs:
Risks:
Release recommendation:
```
