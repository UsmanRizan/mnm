# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# AGENTS.md

## Purpose

This repository is maintained by AI coding agents and human developers.

All agents must prioritize:

1. Maintainability
2. Modularity
3. Readability
4. Testability
5. Scalability

---

# Architecture Rules

## Modular First

Never place unrelated functionality in the same file.

When implementing features:

- Create focused modules.
- Separate business logic from UI.
- Extract reusable utilities.
- Prefer many small files over one large file.

Bad:

```text
src/app.ts (2000+ lines)
```

Good:

```text
src/
├── features/
│   ├── auth/
│   ├── users/
│   └── billing/
├── shared/
├── infrastructure/
└── app.ts
```

---

# Feature-Based Structure

Organize code by feature whenever possible.

Example:

```text
src/features/auth/
├── components/
├── services/
├── repositories/
├── validators/
├── types.ts
├── constants.ts
└── index.ts
```

Avoid organizing the entire project solely by file type.

Bad:

```text
components/
services/
controllers/
models/
```

Preferred:

```text
features/
├── auth/
├── payments/
├── notifications/
```

---

# File Size Limits

Target:

- < 300 lines per file

Warning:

- > 500 lines

Mandatory refactor:

- > 800 lines

When files become large:

- Extract utilities
- Extract hooks
- Extract services
- Extract components
- Extract types

---

# Separation of Concerns

## UI

Contains:

- Rendering
- Styling
- User interaction

Must NOT contain:

- Database logic
- API logic
- Complex business rules

---

## Services

Contains:

- Business logic
- Domain workflows
- Validation orchestration

Must NOT contain:

- UI code

---

## Repositories

Contains:

- Database operations
- External API access
- Persistence logic

---

## Shared

Contains:

- Utilities
- Helpers
- Shared types
- Shared constants

---

# Reusability

Before creating code:

1. Search for existing implementation.
2. Reuse existing modules.
3. Extend existing abstractions.
4. Avoid duplication.

If duplicate logic appears twice:

Refactor into a shared module.

---

# Dependency Rules

Allowed:

```text
UI
 ↓
Services
 ↓
Repositories
```

Not Allowed:

```text
Repositories
 ↓
UI
```

Avoid circular dependencies.

---

# Code Generation Rules

When generating code:

- Show file paths.
- Create multiple files when appropriate.
- Generate types/interfaces first.
- Keep modules cohesive.
- Add documentation when useful.

Prefer:

```text
auth.service.ts
auth.repository.ts
auth.types.ts
auth.constants.ts
```

Over:

```text
auth.ts
```

---

# Testing

New business logic should include tests.

Preferred:

```text
auth.service.ts
auth.service.test.ts
```

Tests should validate:

- Success paths
- Failure paths
- Edge cases

---

# Refactoring

When modifying existing code:

- Improve structure incrementally.
- Remove duplication.
- Preserve behavior.
- Do not perform unrelated rewrites.

---

# Agent Decision Framework

Before writing code ask:

1. Can existing code be reused?
2. Should this be a separate module?
3. Does this violate separation of concerns?
4. Will this still be maintainable in 6 months?

If unsure, choose the more modular solution.

---

# Output Format

For significant changes provide:

1. Architecture overview
2. File tree
3. File contents
4. Explanation of responsibilities

Always optimize for long-term maintainability over short-term convenience.
