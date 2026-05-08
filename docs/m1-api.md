# M1 API Documentation

## Authentication

### POST `/api/auth/register`

Request:

```json
{
  "email": "learner@example.com",
  "password": "Password123!",
  "name": "Learner"
}
```

Success: `201`

```json
{
  "status": 201,
  "user": {
    "id": "user_id",
    "email": "learner@example.com",
    "name": "Learner"
  },
  "accessToken": "jwt",
  "refreshToken": "refresh-token"
}
```

Errors:

- `409 EMAIL_ALREADY_EXISTS`
- `422 VALIDATION_ERROR`

### POST `/api/auth/login`

Request:

```json
{
  "email": "learner@example.com",
  "password": "Password123!"
}
```

Success: `200`

```json
{
  "status": 200,
  "user": {
    "id": "user_id",
    "email": "learner@example.com",
    "name": "Learner"
  },
  "accessToken": "jwt",
  "refreshToken": "refresh-token"
}
```

Errors:

- `401 INVALID_CREDENTIALS`
- `422 VALIDATION_ERROR`

### POST `/api/auth/refresh`

Request:

```json
{
  "refreshToken": "refresh-token"
}
```

Success: `200`

```json
{
  "status": 200,
  "accessToken": "new-jwt"
}
```

Errors:

- `401 INVALID_REFRESH_TOKEN`
- `422 VALIDATION_ERROR`

## Characters

### GET `/api/characters`

Success: `200`

```json
{
  "characters": [
    {
      "id": "emma",
      "name": "Emma",
      "language": "English (UK)",
      "voice": "fish-audio-emma-british",
      "bio": "A London-based academic mentor who helps learners sound precise and polished.",
      "style": "Formal British English, concise explanations, gentle grammar correction.",
      "systemPrompt": "..."
    }
  ]
}
```

### GET `/api/characters/:id`

Success: `200`

```json
{
  "character": {
    "id": "emma",
    "name": "Emma",
    "language": "English (UK)",
    "voice": "fish-audio-emma-british",
    "bio": "...",
    "style": "...",
    "systemPrompt": "..."
  }
}
```

Errors:

- `404 CHARACTER_NOT_FOUND`

## Chat

All chat endpoints require:

```text
Authorization: Bearer <accessToken>
```

### POST `/api/chat/message`

Request:

```json
{
  "characterId": "emma",
  "message": "Hello Emma",
  "sessionId": "optional-existing-session-id"
}
```

Success: `200`, `Content-Type: text/event-stream`

Events:

```text
event: delta
data: {"text":"Certainly..."}

event: done
data: {"sessionId":"session_id","corrections":["..."],"newWords":["..."]}
```

Errors:

- `401 UNAUTHORIZED`
- `422 VALIDATION_ERROR`

### GET `/api/chat/history?page=1&pageSize=20`

Success: `200`

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "sessions": []
}
```

Errors:

- `401 UNAUTHORIZED`
- `422 VALIDATION_ERROR`

### DELETE `/api/chat/:sessionId`

Success: `200`

```json
{
  "deleted": true
}
```

Errors:

- `401 UNAUTHORIZED`
- `404 SESSION_NOT_FOUND`

## Environment

Required variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `MESSAGE_ENCRYPTION_KEY`
- `CLAUDE_API_KEY`

When `CLAUDE_API_KEY` is unset or still a placeholder, the local chat engine returns a deterministic fallback stream for development and tests.
