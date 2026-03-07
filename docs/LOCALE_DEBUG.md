# Finding how Flarum registers this extension’s locale

If admin settings still show raw translation keys, you can see how your Flarum version loads extension locale and what ID it uses.

## 1. Extension ID (backend)

From your Flarum project root (where `composer.json` and `vendor/` live):

```bash
# Search for how Extension ID is derived from package name (e.g. nameToId, getId)
grep -rn "getId\|nameToId\|getId" vendor/flarum/ --include="*.php" 2>/dev/null | head -30
```

Then open the Extension class (often `vendor/flarum/framework/framework/core/src/Extension/Extension.php` or under `extensions` package) and see how `getId()` is implemented (e.g. it may use the composer package name with `/` replaced by `-`, or strip a `flarum-` prefix).

## 2. How locale is loaded (Locales extender)

```bash
# See how extension locale is registered (no extension ID is passed; prefix is null)
cat vendor/flarum/framework/framework/core/src/Extend/Locales.php
```

So the backend loads your `locale/en.yml` with **no prefix**. The catalog keys are exactly the top-level keys in the YAML (e.g. `zerosonesfun-log`, `zerosonesfun-flarum-log`).

## 3. What the frontend receives (admin)

In the browser on the **admin** page (with the extension’s settings open):

1. Open DevTools (F12) → Console.
2. Run:

```javascript
// Which extension IDs are registered
console.log('Extensions:', Object.keys(app.data.extensions || {}));

// If the translator exposes catalogs, inspect them (Flarum version–dependent)
const t = app.translator;
if (t.catalog) console.log('Catalog locales:', Object.keys(t.catalog));
if (t.translations) console.log('Translations:', Object.keys(t.translations));
```

So you can see whether translations are under `zerosonesfun-log` or `zerosonesfun-flarum-log` (or something else).

## 4. Check PHP locale registration (optional)

From Flarum project root:

```bash
# Find where addTranslations is called and whether a “module” (prefix) is passed
grep -r "addTranslations" vendor/flarum/ --include="*.php"
```

In the framework, `Extend\Locales` calls `addTranslations($locale, $filePath)` with **two** arguments only, so the third argument (`$module`) is `null` and the prefix is empty. So the namespace is entirely determined by the root keys in your `locale/en.yml`.

---

**Summary:** The backend uses the keys as they appear in `en.yml` (e.g. `zerosonesfun-log.admin.*`). The admin UI now tries both `zerosonesfun-log` and `zerosonesfun-flarum-log` and falls back to English if neither is in the catalog, so labels should always display even when the catalog ID doesn’t match.
