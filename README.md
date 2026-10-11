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
index.html                   Vite HTML shell
public/images/               Static image assets
```

Brands, news, contact settings, and inquiries still use the current browser's local storage. Product records and product pictures can sync through Supabase so they appear to all visitors.

## Configure admin sign-in

The admin page is hidden from the public navigation. Open it directly at `https://rothanamusk90-star.github.io/vistalabcambodia/?admin=1` after completing these steps:

1. Create a Supabase project and add an email/password user in **Authentication → Users**.
2. Run [`supabase/admin_auth_setup.sql`](supabase/admin_auth_setup.sql) in the Supabase SQL Editor, then uncomment its final insert and replace `YOUR_ADMIN_EMAIL` with that user's email. Run the insert to grant admin access.
3. In GitHub, open **Settings → Secrets and variables → Actions → Variables** and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the Supabase project URL and publishable/anon key. Never use the service role key in the website.
4. Redeploy the `Deploy to GitHub Pages` workflow. The login screen will be enabled after deployment.

## Store products and pictures in Supabase

After admin sign-in is configured, run [`supabase/product_catalog_setup.sql`](supabase/product_catalog_setup.sql) in the Supabase SQL Editor. This creates the product table and public image bucket with policies that let visitors read products and only approved admin accounts change them.

Then open the website, sign in to the admin page, and select **Products**. If the table is empty, the existing product catalog in that browser will be uploaded automatically. After that, new and edited products and their pictures sync through Supabase and appear to visitors on other devices. If the database setup is missing, the Products page shows a setup message and retry button.

The free GitHub Pages hosting continues to serve the website. Supabase stores product data and images; its free plan has usage limits, so check your project usage if the catalog grows substantially. Other CMS content (brands, news, contact settings, and inquiries) still stays in the current browser's local storage.

## Admin traffic analytics

The admin dashboard can show page visits, unique browser sessions, and product views. To enable shared analytics, run [`supabase/website_analytics_setup.sql`](supabase/website_analytics_setup.sql) once in the Supabase SQL Editor. Then redeploy the site and open **Admin → Traffic analytics**. The tracker records the page or product opened and a random session-only ID; the analytics table does not store names, emails, or IP addresses. Without this SQL setup, the dashboard shows instructions and tracking remains inactive.
