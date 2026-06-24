@AGENTS.md

# CLAUDE.md

## Project Architecture Rules

When creating or modifying code in this repository, follow these principles:

### 1. Modular Design

- Keep files small and focused on a single responsibility.
- Avoid large monolithic files.
- Split functionality into reusable modules.
- Prefer composition over duplication.

### 2. Directory Structure

Use the following structure unless the project already defines a different convention:

```
src/
├── components/
├── services/
├── controllers/
├── models/
├── utils/
├── hooks/
├── types/
├── config/
├── constants/
└── index.ts
```

### 3. File Size Limits

- Aim for files under 300 lines.
- If a file exceeds 500 lines, refactor it into smaller modules.
- Extract reusable logic into separate files.

### 4. Separation of Concerns

- UI components should only handle presentation.
- Business logic belongs in services.
- Data access belongs in repositories/models.
- Utility functions belong in utils.
- Configuration belongs in config.

### 5. Imports

- Prefer absolute imports when supported.
- Avoid circular dependencies.
- Export public APIs through index files.

Example:

```ts
// services/index.ts
export * from "./userService";
export * from "./authService";
```

### 6. Reusability

Before creating new code:

1. Search for existing implementations.
2. Reuse existing utilities where possible.
3. Create shared abstractions for repeated patterns.

### 7. Adding Features

When implementing a feature:

1. Create necessary modules first.
2. Keep business logic separate from presentation.
3. Add types/interfaces.
4. Add tests alongside implementation.

Example:

```
src/features/auth/
├── components/
├── services/
├── hooks/
├── types.ts
├── constants.ts
└── index.ts
```

### 8. Refactoring Rules

When editing existing code:

- Improve modularity where reasonable.
- Extract duplicated logic.
- Do not introduce large files.
- Preserve backward compatibility unless explicitly instructed otherwise.

### 9. Output Expectations

When generating code:

- Create multiple files when appropriate.
- Show file paths.
- Explain module responsibilities.
- Prefer maintainable architecture over minimal file count.

Always optimize for readability, maintainability, scalability, and testability.
