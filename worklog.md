---
Task ID: 1
Agent: Main
Task: Fix /api/auth/login 401 Unauthorized error

Work Log:
- Investigated the 401 error on POST /api/auth/login
- Confirmed auth.ts, login route, validations all exist and are correct
- Discovered DATABASE_URL was pointing to Neon PostgreSQL, but Coolify has its own PostgreSQL instance
- Updated local .env to use Coolify's public PostgreSQL URL (164.68.126.14:5436)
- Pushed Prisma schema to Coolify PostgreSQL (was already in sync)
- Seeded Coolify PostgreSQL with admin user, test user, investment plans, affiliate levels, etc.
- Discovered the seed script was generating corrupted password hashes (161-char hex format instead of 60-char bcrypt)
- Root cause: `bcrypt.hash()` async in tsx was producing wrong output; fixed by using `bcrypt.hashSync()`
- Updated admin and user passwords directly in the database with correct bcrypt hashes
- Verified login API returns 200 with correct user data
- Fixed seed.ts to use hashSync and update passwords on upsert (not just create)
- Added `prisma.seed` config and `tsx` dev dependency to package.json
- Pushed fix to GitHub

Stage Summary:
- Login now works: admin@plataformaroi.com / Admin@2026!
- Database switched from Neon to Coolify PostgreSQL
- All seed data populated in Coolify's PostgreSQL
- Container env vars verified: DATABASE_URL points to Coolify internal PostgreSQL
