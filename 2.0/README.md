# Drink Log (zerosonesfun/flarum-log)

A [Flarum](https://flarum.org/) extension that adds a **Drinking** button, tracks who’s drinking (live count + per-user totals), and opens a dated log discussion with an optional **Log** tag.

- **Compatible:** Flarum 1.8.x  
- **Install:** `composer require zerosonesfun/flarum-log:"*"`  
- **Best experience:** Install [FoF Direct Links](https://github.com/FriendsOfFlarum/direct-links) so the composer opens with title, Log tag, and a simple body template already filled in.

## Features

- **“X Drinking” button** (logged-in only): in the **sidebar** on desktop (under “Start a discussion”), and in the **drawer** under the search bar on mobile.  
  `X` is the number of users who have clicked in the last 30 minutes (configurable 1–1440).
- **Cooldown:** Each user can add to the live count once per cooldown window; the number goes down as older clicks expire.
- **One click does two things:**
  1. Records your “drinking” click (live count + your **profile total**).
  2. Opens the **new discussion** composer with title `Log - MM/DD/YYYY` and, when configured, the **Log** tag. With **FoF Direct Links**, the composer also opens with a small body template (Date, Time, Location, Amount, Variety).
- **Profile total:** Each user’s public profile shows their total drinks (e.g. “1 drink” or “1.5k drinks”). This total only goes up: it increases when they use the button (after cooldown) or when they **manually** create a discussion and add the Log tag.
- **Manual Log tag:** If someone starts a new discussion and adds the Log tag in the composer (without using the Drinking button), their profile total still increases by 1.

## Installation

```bash
composer require zerosonesfun/flarum-log:"*"
php flarum migrate
```

Enable **Drink Log** in Admin → Extensions.

## Recommended: FoF Direct Links (best experience)

For the best experience, install [FriendsOfFlarum/direct-links](https://github.com/FriendsOfFlarum/direct-links):

```bash
composer require fof/direct-links
```

With Direct Links enabled and a **Log tag slug** set in Drink Log’s settings, clicking the Drinking button opens the composer via a direct link with:

- **Title** pre-filled: `Log - DD/MM/YYYY`
- **Primary tag** pre-selected: your configured Log tag
- **Body** pre-filled with a short template: `Date`, `Time`, `Location`, `Amount`, `Variety`

Without Direct Links, the composer still opens in-app with the title set, and the Log tag is attached when you post (for “Log - date” discussions).

## Optional: Tags extension and Log tag

If you use [flarum/tags](https://github.com/flarum/tags):

1. Enable the **Tags** extension.
2. In Administration → Tags, create a tag with the slug you set in Drink Log’s **Log tag slug** (default `log`). The extension does not create the tag for you.

New “Log - date” discussions started from the Drinking button get that tag attached automatically. If a user manually adds the Log tag to any new discussion, their profile drink total also increases by 1. This extension never deletes or changes existing tags.

## Admin settings

In **Administration → Extensions → Drink Log** you can set:

- **Button label** – Text on the button. Use `{count}` for the number (e.g. `{count} Drinking`).
- **Cooldown (minutes)** – Minutes before a user can add to the live count again (1–1440; default 30).
- **Log tag slug** – Tag slug to attach to “Log - date” discussions and to use with Direct Links. Leave empty to disable auto-tagging and direct-link composer.

## Building the frontend (developers)

```bash
cd js
npm install
npm run build
```

This updates `js/dist/forum.js` and `js/dist/admin.js`. Commit those files if you ship a pre-built bundle.

## Security

- Only logged-in users see and can use the Drinking button.
- The “record drink” API requires authentication; cooldown is enforced per user on the backend.
- Profile totals are public; only the count is stored (no extra personal data).

## License

MIT.
