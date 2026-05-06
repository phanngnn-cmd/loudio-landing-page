# Loudio Admin Portal Guide

Use `admin.html` to draft, preview, publish, and manage Loudio blog posts.

## 1. Before You Start

1. Deploy the latest `gas_lead_capture.gs` in Google Apps Script.
2. In Apps Script Project Settings, add a Script Property named `ADMIN_TOKEN`.
3. Open `admin.html` in the browser.
4. Enter the same `ADMIN_TOKEN` as your admin passkey.

Optional: add `BLOG_IMAGE_FOLDER_ID` as a Script Property if you want uploads to go into a specific Google Drive folder. If you do not set it, the script creates a folder named `Loudio Blog Images`.

Do not publish or share the admin token in screenshots, page content, article drafts, docs, or chat. If admin login fails, first confirm the Apps Script deployment is current and that `ADMIN_TOKEN` exists in Script Properties.

## 2. Create A New Article

1. Click `New`.
2. Fill in `Title`, `Excerpt`, `Author`, and `Category`.
3. Paste or write the article body in `Content`.
4. Keep `Publication status` as `Draft` while editing.
5. Watch the live preview on the right to check layout, image, links, and headings.
6. Click `Save`.

The public article URL appears in the `Public link` area after the post has an ID.

## 3. Upload A Featured Image

1. Choose a JPG, PNG, or WebP file under `Upload JPG, PNG, or WebP`.
2. Click `Upload Image`.
3. The portal compresses the image, sends it to Google Drive, and fills `Featured image URL`.
4. Add useful `Image alt text`, for example: `Loudio team member at Forbes Under 30 Summit in Phoenix`.

If Drive upload is blocked by browser or Apps Script permissions, paste a hosted image URL into `Featured image URL`.

## 4. Write Content Safely

Supported content tags include:

- Paragraphs: `<p>...</p>`
- Headings: `<h2>...</h2>`, `<h3>...</h3>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Emphasis: `<strong>`, `<em>`
- Quotes: `<blockquote>`
- Links: `<a href="https://...">...</a>`
- Images: `<img src="https://..." alt="...">`

Avoid scripts, embedded widgets, iframes, forms, inline event handlers, and SVG uploads. The public article page sanitizes unsafe markup before rendering.

## 5. Publish Or Update

1. Change `Publication status` to `Published`.
2. Click `Save`.
3. Wait a few seconds, then click `Refresh`.
4. Open the public blog page from `Open Blog`.

To unpublish a post, change the status back to `Draft` and save.

## 6. Edit Existing Posts

1. Use the search box to find an article by title, author, category, or excerpt.
2. Select it from the left panel.
3. Edit fields as needed.
4. Click `Save`.

The editor saves the current version as the latest version in the Google Sheet.

## 7. Delete A Post

1. Select the article.
2. Click `Delete`.
3. Confirm only if you are sure.

Deletion removes the article row from the sheet. Prefer switching to `Draft` if you may need the post later.

## 8. Suggested Publishing Checklist

- Title is specific and useful.
- Excerpt explains the value in one sentence.
- Featured image loads in preview.
- Featured image URL renders safely in preview.
- Alt text describes the image.
- Links point to trusted sources and use full `https://` URLs.
- Content was written or pasted from a trusted source.
- Article ends with a relevant CTA.
- Status is `Published` only when ready.
- After Apps Script changes, redeploy the Web App and test save, preview, publish, and public article loading.
