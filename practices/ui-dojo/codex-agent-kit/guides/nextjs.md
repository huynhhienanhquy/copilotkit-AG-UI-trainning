# Next.js Guide

Override rules for Next.js full-stack projects.

## Package Manager

```bash
npm run dev           # development server
npm run build         # production build
npm run start         # production server
npm run test          # test suite
npm run lint          # linting
npm run typecheck     # type checking
```

## Project Conventions

- App Router: `app/` directory with route groups
- Components: `components/` (shared) or co-located with route
- Lib: `lib/` for utilities, db, auth
- API Routes: `app/api/*/route.ts`

## Next.js-Specific Rules

- Use Server Components by default; add `'use client'` only when needed.
- Do not fetch data in client components when Server Components can do it.
- Use `loading.tsx` and `error.tsx` for route-level loading and error states.
- Prefer `next/image` for images with proper `alt` and `width`/`height`.
- Use `next/link` for internal navigation; do not use `<a>` for internal routes.
- Metadata and SEO: use `generateMetadata` for dynamic pages.

## API Routes

- Validate request body at the boundary.
- Return consistent error shapes: `{ error: string, code: string }`.
- Use `NextResponse` for status codes and headers.
- Handle streaming with `ReadableStream` when applicable.

## Testing

```bash
npm run test -- --coverage   # with coverage
npm run test -- --watch       # watch mode
```

- Test API routes with mock request/response objects.
- Test Server Components by rendering and asserting output.
- Mock external services (db, auth, email) at the boundary.

## Build and Deploy

```bash
npm run build          # production build
npm run start          # production server
```

- Verify `next.config.js` for redirects, rewrites, and headers.
- Check `middleware.ts` for auth and routing logic.
