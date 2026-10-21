# Cloudflare data services

This folder contains the D1 schema and Worker API that replace the site's Supabase database, image storage, and admin password login. Do not deploy the front-end migration until the Worker resources, first admin, and data import are ready: an empty D1 database will not contain the live Supabase content.

## Create Cloudflare resources

1. Sign in with `npx wrangler login` and verify with `npx wrangler whoami`.
2. Create the D1 database and R2 bucket:

   ```powershell
   npx wrangler d1 create vistalab-prod
   npx wrangler r2 bucket create vistalab-media
   ```

3. Put the returned D1 `database_id` in `wrangler.jsonc` in place of the local placeholder.
4. Apply the schema and deploy the Worker:

   ```powershell
   npx wrangler d1 migrations apply vistalab-prod --remote
   npx wrangler secret put SESSION_SECRET
   npx wrangler deploy
   ```

   Use a fresh random secret of at least 32 bytes for `SESSION_SECRET`. `ALLOWED_ORIGINS` in `wrangler.jsonc` must list the exact production website origin.

5. Create or reset the admin password. This generates a PBKDF2 password hash locally and prints only the SQL statement; enter the statement in a private terminal and run it against D1:

   ```powershell
   node cloudflare/scripts/create-admin.mjs admin@example.com > cloudflare-admin.sql
   npx wrangler d1 execute vistalab-prod --remote --file=cloudflare-admin.sql
   Remove-Item cloudflare-admin.sql
   ```

   Enter the password at the hidden prompt. Keep the generated SQL file private and remove it after applying.

6. Add the Worker base URL as the GitHub Actions repository variable `VITE_CLOUDFLARE_API_URL`. The Pages workflow uses it to build the frontend.

## Move existing records and images

Before deploying the new frontend, use the currently deployed site’s **Admin → Data & storage → Download backup** action. Preserve that private backup; it includes Supabase table exports and image files. Admin accounts are recreated in D1 with a new password; Supabase password hashes/sessions are not copied.

The D1 schema is in `migrations/0001_initial.sql`. The old Supabase backup export still needs a dedicated importer into D1 and R2 before the cutover. Verify product, site-content, traffic, inquiry, and image counts in the Cloudflare Worker before switching the GitHub Pages build variable and retiring Supabase.

Inquiries are stored in D1 after this cutover. Admin-only endpoints require a signed 12-hour session. Public endpoints are limited to product reads, content reads, image reads, inquiry submission, and anonymous analytics writes.
