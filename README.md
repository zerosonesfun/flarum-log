# Drink Log (zerosonesfun/flarum-log)

A [Flarum](https://flarum.org/) extension that adds a **Drinking** button under “Start a discussion” and opens a dated log discussion with an optional **Log** tag.

- **Compatible:** Flarum 1.8.x  
- **Install:** `composer require zerosonesfun/flarum-log:"*"`

## Features

- **“X Drinking” button** (only when logged in) under the default “Start a discussion” button.  
  `X` is the number of users who have clicked in the last 30 minutes.
- **30‑minute cooldown:** Each user can click once per 30 minutes; the count goes down as older clicks expire.
- **One click does two things:**
  1. Records your “drinking” click (increments the counter, subject to cooldown).
  2. Opens the **new discussion** composer with:
     - **Title:** `Log - MM/DD/YYYY` (e.g. `Log - 03/07/2026`).
     - **Log tag:** If the [Tags](https://github.com/flarum/tags) extension is enabled and a tag with slug `log` exists, new discussions created from this button are automatically given that tag.

## Installation

```bash
composer require zerosonesfun/flarum-log:"*"
php flarum migrate
```

Then enable **Drink Log** in the Admin → Extensions panel.

## Admin settings

In **Administration → Extensions → Drink Log**, you can configure:

- **Button label** – Text shown on the button. Use `{count}` as a placeholder for the number (default: `{count} Drinking`).
- **Cooldown (minutes)** – How many minutes must pass before a user can click again (1–1440; default: 30).
- **Log tag slug** – When the Tags extension is enabled, this tag is attached to new “Log - date” discussions. Default: `log`. Change to use a different tag, or leave empty to disable auto-tagging.

## Optional: Log tag (Tags extension)

If you use [flarum/tags](https://github.com/flarum/tags):

1. Enable the **Tags** extension.
2. Create a tag with the slug you set in **Log tag slug** (default **`log`**) in Administration → Tags. The extension does not create the tag for you (tags table layout can vary by site).

New “Log - date” discussions started from the Drinking button are tagged with the configured tag automatically. **This extension never deletes or modifies existing tags**—it only attaches the configured tag to new "Log - date" discussions when they are created.

### Composer opening with the Log tag pre-selected

To have the composer open with the **Log tag already selected**, install [FoF Direct Links](https://github.com/FriendsOfFlarum/direct-links). When **Log tag slug** is set, Drink Log navigates to `/composer?title=...&primary_tag=your-slug`, which Direct Links uses to open the composer with title and tag pre-filled. Without Direct Links, the composer still opens in-app with the title set; the tag is applied when you post (backend attaches it to "Log - date" discussions).

## Building the frontend (developers)

To change the extension’s JavaScript and rebuild:

```bash
cd js
npm install
npm run build
```

This updates `js/dist/forum.js` and `js/dist/admin.js`. Commit those files if you want to ship a pre-built bundle.

## Security

- Only logged-in users see and can use the Drinking button.
- The “record drink” API requires authentication; cooldown is enforced per user in the backend.

## License

MIT.
