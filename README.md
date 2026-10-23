# VistaLab Cambodia Website

## Open and run the website

1. Open a terminal in this project folder.
2. Install dependencies if this is the first run:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the local URL printed in the terminal. It is usually <http://localhost:5173>.
5. To stop the server, press `Ctrl+C` in the terminal.

## Build and preview

- Check TypeScript and create a production build:

  ```bash
  npm run build
  ```

  The production files are created in the `dist/` folder.

- Preview the production build on your computer:

  ```bash
  npm run preview
  ```

  Open the local URL printed in the terminal.

## Source layout

```text
vistalab/
  App.tsx                    Main app and page views
  main.tsx                   React entry point
  styles.css                 Global and responsive styles
  components/                Shared UI components
    CountryFlag.tsx
    ImageUpload.tsx
    Modal.tsx
  data/
    siteData.ts              Initial brands, products, news, and hubs
    translations.ts          English and Khmer copy
  utils/
    storage.ts               Browser storage helper
    productRepository.ts     Product database and image uploads
    siteContentRepository.ts Shared page content and image uploads
index.html                   Vite HTML shell
public/images/               Static image assets
```

When Supabase is configured, products, editable site content, inquiries, traffic events, and images sync between visitors.

## Configure admin sign-in

The admin page is hidden from the public navigation. Open it directly at `https://rothanamusk90-star.github.io/vistalabcambodia/?admin=1` after completing these steps:

1. Create a Supabase project and add an email/password user in **Authentication → Users**.
2. Run [`supabase/admin_auth_setup.sql`](supabase/admin_auth_setup.sql) in the Supabase SQL Editor, then uncomment its final insert and replace `YOUR_ADMIN_EMAIL` with that user's email. Run the insert to grant admin access.
3. In GitHub, open **Settings → Secrets and variables → Actions → Variables** and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the Supabase project URL and publishable/anon key. Never use the service role key in the website.
4. Redeploy the `Deploy to GitHub Pages` workflow. The login screen will be enabled after deployment.

## Store products and pictures in Supabase

After admin sign-in is configured, run [`supabase/product_catalog_setup.sql`](supabase/product_catalog_setup.sql) in the Supabase SQL Editor. This creates the product table and public image bucket with policies that let visitors read products and only approved admin accounts change them.

Then open the website, sign in to the admin page, and select **Products**. If the table is empty, the existing product catalog in that browser will be uploaded automatically. After that, new and edited products and their pictures sync through Supabase and appear to visitors on other devices. If the database setup is missing, the Products page shows a setup message and retry button.

## Wholesale price catalogs

The admin page includes **Catalog Studio**, based on the supplied standalone editor. It supports multiple catalog pages, product and discount tables, three price lists, bulk price changes, photo layouts, live A4 preview, PNG/PDF export, and JSON backup/restore. Its data is stored privately in Supabase and is not shown on public product pages. Run [`supabase/price_catalogs_setup.sql`](supabase/price_catalogs_setup.sql) in the Supabase SQL Editor before using it.

Staff can use the read-only catalog viewer at `?catalog=staff` (append it to the website address). Staff accounts must first be created in Supabase Authentication, then added to `public.catalog_staff_users`; the SQL file includes the grant statement. Staff can switch catalog page and price list and download the current sheet as a JPG. Only approved staff and admins can open the viewer or read the catalog data.

## Store other website images and content in Supabase

Run [`supabase/site_content_storage_setup.sql`](supabase/site_content_storage_setup.sql) in the Supabase SQL Editor too. Then open the site and sign in to the admin page. The first admin visit copies existing brands, news, page text, contact details, and uploaded banner/logo/flag/news images from that browser into Supabase. Future edits sync automatically; pictures are stored in the public `site-images` bucket. The admin dashboard shows whether the setup is connected or needs attention.

Use **Admin → Data & storage** to check product, site content, and traffic table availability, view image counts and estimated size by bucket, and open recent uploads. Click **Check again** to refresh the dashboard values.

GitHub Pages hosts the website. Supabase stores products, editable page content, uploaded pictures, traffic history, and visitor inquiries; monitor your project usage as the site grows.

Run [`supabase/inquiries_setup.sql`](supabase/inquiries_setup.sql) to store visitor inquiries in Supabase. Visitors can submit inquiries, while only approved admins can read or update them. The GitHub Pages workflow uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; Cloudflare Worker settings are not required by the website frontend.

## Admin traffic analytics

The admin dashboard can show page visits, unique browser sessions, and product views. To enable shared analytics, run [`supabase/website_analytics_setup.sql`](supabase/website_analytics_setup.sql) once in the Supabase SQL Editor. Then redeploy the site and open **Admin → Traffic analytics**. The tracker records the page or product opened and a random session-only ID; the analytics table does not store names, emails, or IP addresses. Without this SQL setup, the dashboard shows instructions and tracking remains inactive.

## GitHub security and maintenance

- The Pages workflow builds pull requests targeting `main` but only deploys pushes to `main` or a manual run. Build jobs have read-only repository access; only the deploy job can publish Pages and request its deployment token. Third-party actions are pinned to commit SHAs, and checkout does not persist its token.
- Dependabot checks npm packages and GitHub Actions weekly and opens update pull requests. Review and merge those updates after the checks pass.
- In **Settings → Security → Code security and analysis**, enable Dependabot alerts and private vulnerability reporting. Use **Settings → Environments → github-pages** to restrict deployment to `main` if your repository settings support deployment branch rules.
- Protect `main` in **Settings → Branches**: require pull requests and passing checks before merging, and block force pushes and branch deletion. Enable required reviews if someone else also maintains the project.
- Keep `.env` files and credentials out of Git. `.gitignore` excludes local environment files; `.env.example` contains placeholders only. The website's Supabase URL and publishable/anon key are included in the public browser bundle, so they are configuration values rather than secrets. Never use a Supabase service-role or other privileged key in this frontend or in GitHub Actions variables.
- The anon key is safe to expose only when Supabase Row Level Security and policies are configured correctly. Run the relevant SQL setup files, review their policies, and test visitor and admin access. Rotate any privileged key that was ever committed or exposed.
- After updating this project, rerun [`supabase/inquiries_setup.sql`](supabase/inquiries_setup.sql) in the Supabase SQL Editor to apply its current public-submission checks. These limit inquiry fields and prevent visitors from setting admin workflow status or timestamps.
- Protect admin and staff accounts with unique passwords, enable Supabase's available multi-factor authentication options, and remove access for people who no longer need it.

For vulnerability reports, use the private process in [`SECURITY.md`](SECURITY.md) rather than opening a public issue.
