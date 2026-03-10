# Drink Log – Flarum 2.0 compatibility

This folder contains the **Flarum 2.0**-oriented version of the extension. The parent directory remains the **Flarum 1.8** version and must not be changed for 1.8 compatibility.

## What was updated for 2.0

### Backend (PHP)
- **composer.json**: `flarum/core` ^2.0.0-beta, `php` ^8.2, `flarum-extension.category` added.
- **extend.php**: `ApiSerializer` extenders removed. Forum and User attributes (`drinkCount`, `drinkDirectLinksEnabled`, `drinkLogTagId`, `drinkVarietyAutocompleteList`, `drinkLogTotal`, `drinkLogDiscussionsCount`) are added via `Extend\ApiResource(ForumResource::class)` and `Extend\ApiResource(UserResource::class)` with `->fields()` and **Flarum 2.0 API** types. Namespaces used: `Flarum\Api\Resource\ForumResource`, `Flarum\Api\Resource\UserResource`, `Flarum\Api\Schema` (Number, Boolean, Arr), `Flarum\Api\Context` — per [Updating for 2.0](https://docs.flarum.org/2.x/extend/update-2_0) and [Upgrading to 2.0 API Layer](https://docs.flarum.org/2.x/extend/update-2_0-api).
- **Routes, Event, Settings, Frontend, Locales**: Unchanged; same extenders as 1.8.
- **Controllers, Listener, Model**: No changes; they should still work on 2.0.

### Frontend (JS)
- **Admin**: `app.extensionData` removed. Settings are registered in **extend.js** via `new Extend.Admin().setting(...)` (three settings with priorities 30, 20, 10). **admin/index.js** only exports extend and a no-op initializer.
- **Forum**: All imports use the **ext:** prefix (e.g. `ext:flarum/forum/app`, `ext:flarum/common/extend`, `ext:flarum/forum/components/IndexSidebar`).
- **IndexSidebar**: `IndexPage.prototype.sidebarItems` is replaced by **IndexSidebar.prototype.items** (extend target and method name). The sidebar button is added there; drawer button still uses `HeaderSecondary.prototype.items`.
- **openLogComposer**: The first argument is now the IndexSidebar instance; getting the page for `newDiscussionAction()` may need adjustment once 2.0’s component tree is final (e.g. `indexSidebar?.attrs?.state?.getPage?.()` or equivalent).

### Build
- **js/package.json**: `flarum-webpack-config` set to **^3.0.0** for 2.0.

### Migrations
- No changes. The existing migrations (including the Builder `up`/`down` format for the FK) should still run on 2.0.

## How to use this folder

- Use this **2.0** folder as the source when building or packaging the extension **for Flarum 2.0** (e.g. copy or symlink into a 2.0 project, or point your 2.0 composer package at this tree).
- Do **not** replace the parent (1.8) files with these; keep both versions so 1.8 and 2.0 can be supported from the same repo.

## When 2.0 is released

1. Confirm **extend.php** namespaces: `Flarum\Api\Resource\ForumResource`, `Flarum\Api\Resource\UserResource`, `Flarum\Api\Schema`, `Flarum\Api\Context` (per official 2.x docs).
2. Confirm **forum JS** import paths: `ext:flarum/forum/...` and component names (e.g. `IndexSidebar`).
3. Test **openLogComposer** with the real 2.0 IndexSidebar/page structure and fix `newDiscussionAction()` context if needed.
4. Run **npm install** and **npm run build** in **2.0/js** against the 2.0 toolchain and fix any webpack/import errors.
