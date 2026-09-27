# Thời khóa biểu lớp 6A01

Printable class timetable. Visitors can print A4 or A5 landscape. An admin can edit text, colors, font size, drag blocks into place, drag lessons between cells, and merge or split cells.

## Local

```bash
npm install
npm run dev
```

Open http://localhost:3000. Admin login defaults to `ad` / `6a01`.

While developing, **Lưu** writes `data/schedule.json` (gitignored). Without that file, the built-in timetable is shown.

## Editing

- Drag the class name, the banner, or the `⋮⋮` handle to move a block.
- Drag a lesson cell onto another cell to swap the text and colors. The merge shape stays put.
- Shift-click (or Shift-drag) several cells, then **Gộp ô**. A merged cell can span multiple periods, multiple days, or both.
- **Tách ô** restores each cell. Hidden text from before the merge comes back.
- The side panel edits the selected text, text color, background, font size, and block position.

## Print

**In A4 ngang** or **In A5 ngang**. In the print dialog, turn off headers and footers so the sheet fits on one page. Colors are part of the timetable, so leave background graphics enabled.

## Deploy on Vercel (Hobby)

1. Push this project to GitHub and import it in Vercel.
2. In the project, open **Storage** → **Create** → **Blob**. Connect the store to this project. Vercel adds `BLOB_READ_WRITE_TOKEN`. Saves do not stick on Vercel without Blob, because the serverless disk is read-only.
3. Optional environment variables: `AUTH_SECRET` (long random string), `ADMIN_USER`, `ADMIN_PASSWORD`. If you omit the admin variables, the login stays `ad` / `6a01`.
4. If the Blob store is private, set `BLOB_ACCESS=private`. A public store can omit it.
5. Deploy.

## Cloudflare domain

Keep DNS at Cloudflare and point the records at Vercel. Use the exact values shown on the Vercel domain card if they differ.

1. Vercel → Project → **Settings** → **Domains** → add the domain (apex and `www` if you use both).
2. In Cloudflare DNS, set the records to **DNS only** (grey cloud) until Vercel shows the certificate as valid:
   - `A` `@` → `76.76.21.21`
   - `CNAME` `www` → the CNAME target from the Vercel domain card (often a host like `xxxx.vercel-dns-0.com`)
3. Leave the proxy off while the certificate is issued. An orange-cloud proxy hides the real records, so Vercel cannot verify the domain.

After the site is verified you can turn the proxy on if you want, then set SSL/TLS to **Full (strict)**.
