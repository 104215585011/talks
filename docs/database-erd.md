# LinguaAI Database ERD

This ERD covers the initial PostgreSQL schema for TICKET-002.

```mermaid
erDiagram
  users ||--o{ sessions : owns
  characters ||--o{ sessions : powers
  sessions ||--o{ messages : contains

  users {
    string id PK
    string email UK
    string name
    string native_language
    string target_language
    datetime created_at
    datetime updated_at
  }

  characters {
    string id PK
    string slug UK
    string name
    string locale
    string system_prompt
    string avatar_url
    boolean is_active
    datetime created_at
    datetime updated_at
  }

  sessions {
    string id PK
    string user_id FK
    string character_id FK
    string title
    string status
    datetime created_at
    datetime updated_at
  }

  messages {
    string id PK
    string session_id FK
    string role
    string content
    string audio_url
    json metadata
    datetime created_at
  }
```

## Relationships

- One user can own many sessions.
- One character can be used by many sessions.
- One session contains many messages.
- Deleting a user cascades to their sessions and messages.
- Deleting a session cascades to its messages.
- Deleting a character is restricted while sessions reference it.

## Indexes

- `users.email` unique index for login/profile lookup.
- `characters.slug` unique index for route/API lookup.
- `sessions.user_id` for user history queries.
- `sessions.character_id` for analytics by character.
- `sessions.status` for active/archive filtering.
- `messages.session_id, messages.created_at` for ordered conversation loading.
