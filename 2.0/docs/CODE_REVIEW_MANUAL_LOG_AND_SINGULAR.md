# Code Review: Manual Log Tag + Singular “1 drink”

## Scope

- **Feature 1:** When a user creates a new discussion and manually adds the Log tag (without using the special button), their profile “total drinks” increases by 1.
- **Feature 2:** On the user card, show “1 drink” (singular) when total is 1, and “{count} drinks” (plural) otherwise.

---

## 1. Backend – Manual Log Tag → +1 Total

### 1.1 `DrinkClick::recordClickWithoutCooldown(int $userId)`

- **Purpose:** Inserts one `drink_clicks` row so the user’s profile total goes up, with no cooldown (used only for manual “Log tag” discussions).
- **Guard:** Returns immediately if `$userId <= 0`, so no invalid or guest user_id is written. Safe.
- **Implementation:** Same insert pattern as `recordClick()` (user_id, clicked_at). No cooldown check. Fits the existing model and table.

### 1.2 `AttachLogTagToDiscussion` listener

- **When it runs:** Only for **new** discussions (`!$discussion->exists`), when Tags is enabled and a non-empty log tag slug is configured and the tag exists.
- **Logic:**
  - Reads `relationships.tags.data` from `$event->data` (JSON:API payload from the client).
  - `$userAlreadyHadLogTag` = configured Log tag is already in that list (user chose it in the composer).
  - `$isLogTitle` = discussion title starts with `"Log - "`.
- **When we record a drink:** Only if `$userAlreadyHadLogTag && !$isLogTitle`, and only if `$discussion->user_id` is a positive integer (author guard).
- **When we attach the tag:** Only if `$isLogTitle` and the Log tag is not already in the request; then we add it to `$event->data['relationships']['tags']['data']`.

**Double-count prevention:**

- **Button flow (no Direct Links):** Title is “Log - …”, client usually doesn’t send the tag. We add the tag. We do **not** record here. The button POST already recorded the click. ✓
- **Button flow (with Direct Links):** Title is “Log - …”, client may already send the tag. We don’t add it again. We do **not** record because `$isLogTitle` is true. ✓
- **Manual flow:** User adds the Log tag and uses any other title. We record once via `recordClickWithoutCooldown($authorId)`. ✓

**Edge cases:**

- **Author guard:** We only call `recordClickWithoutCooldown` when `(int) $discussion->user_id > 0`, so we never insert with 0 or negative user_id.
- **Missing tag in request:** If the structure is missing or different, `Arr::get(..., [])` yields `[]`, so we don’t record or add the tag incorrectly.
- **Tag ID type:** We compare `(string) $tag->id` with IDs from the payload; consistent with JSON:API string IDs.

**Side effect:** The new row also increases the “live” drinking count (clicks in the cooldown window). That’s consistent: posting a log discussion is treated as a drink event.

---

## 2. Frontend – Singular vs Plural

### 2.1 UserCard `infoItems`

- **Condition:** `total === 1` → use `user_card_drink` (no `count`). Otherwise → use `user_card_drinks` with `{ count: countLabel }`.
- **Result:** “1 drink” for total 1, “0 drinks” / “2 drinks” / “1.5k drinks” etc. for others. Correct.
- **Data:** `total` from `user.attribute('drinkLogTotal')`; `countLabel = abbreviateNumber(total)`. Same as before; only the key and attrs change by count.

### 2.2 Locale

- **Keys:** `user_card_drink: '1 drink'` and `user_card_drinks: '{count} drinks'` in both `zerosonesfun-log` and `zerosonesfun-flarum-log`.
- **Coverage:** Singular and plural are translatable; other locales can override as needed.

---

## 3. Summary

| Area              | Status | Notes                                                                 |
|-------------------|--------|-----------------------------------------------------------------------|
| Manual log → +1   | Good   | Only when user had Log tag and title is not “Log - ”; author guarded. |
| No double-count   | Good   | Button flow never records in the listener.                            |
| recordClickWithoutCooldown | Good | No cooldown; guarded for invalid user id.                             |
| Singular “1 drink”| Good   | Correct key and attrs for total === 1 vs other.                       |
| Locale            | Good   | Both namespaces; singular and plural.                                |

**Change made during review:** Added `$authorId > 0` check before calling `recordClickWithoutCooldown` in the listener, and `$userId <= 0` guard inside `recordClickWithoutCooldown`, so we never write an invalid user_id.

No further changes required for this addition.
