<?php

namespace ZerosOnesFun\Drinks;

use Carbon\Carbon;
use Flarum\Database\AbstractModel;
use Flarum\User\User;

class DrinkClick extends AbstractModel
{
    protected $table = 'drink_clicks';

    public $timestamps = false;

    /** @var array<int, int> Request-scoped cache for totalCountForUser (invalidated by decrementCountForUser). */
    protected static $totalCountCache = [];

    public const DEFAULT_COOLDOWN_MINUTES = 30;

    protected $casts = [
        'clicked_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Count clicks that are still within the cooldown window.
     *
     * @param int $minutes Cooldown length in minutes (default 30).
     */
    public static function currentCount(int $minutes = self::DEFAULT_COOLDOWN_MINUTES): int
    {
        $minutes = max(1, $minutes);
        $cutoff = Carbon::now()->subMinutes($minutes);

        return static::query()
            ->where('clicked_at', '>', $cutoff)
            ->count();
    }

    /**
     * Check if the user has clicked within the cooldown window.
     *
     * @param int $minutes Cooldown length in minutes (default 30).
     */
    public static function hasRecentClick(int $userId, int $minutes = self::DEFAULT_COOLDOWN_MINUTES): bool
    {
        $minutes = max(1, $minutes);
        $cutoff = Carbon::now()->subMinutes($minutes);

        return static::query()
            ->where('user_id', $userId)
            ->where('clicked_at', '>', $cutoff)
            ->exists();
    }

    /**
     * Total number of drink logs for a user. Increases when they log a drink; decreases by 1 when they delete
     * one of their own discussions that has the Log tag. Uses a request-scoped cache (invalidated on decrement).
     *
     * @param int $userId
     * @return int
     */
    public static function totalCountForUser(int $userId): int
    {
        if (array_key_exists($userId, self::$totalCountCache)) {
            return self::$totalCountCache[$userId];
        }

        $count = (int) static::query()
            ->where('user_id', $userId)
            ->count();

        self::$totalCountCache[$userId] = $count;

        return $count;
    }

    /**
     * Record a drink click for the user. Returns true if recorded, false if on cooldown.
     *
     * @param int $minutes Cooldown length in minutes (default 30).
     */
    public static function recordClick(int $userId, int $minutes = self::DEFAULT_COOLDOWN_MINUTES): bool
    {
        if (self::hasRecentClick($userId, $minutes)) {
            return false;
        }

        $click = new static();
        $click->user_id = $userId;
        $click->clicked_at = Carbon::now();
        $click->save();

        return true;
    }

    /**
     * Record a drink for the user without cooldown (e.g. when they manually create a discussion with the Log tag).
     * Still inserts one row so their profile total increases.
     */
    public static function recordClickWithoutCooldown(int $userId): void
    {
        if ($userId <= 0) {
            return;
        }
        $click = new static();
        $click->user_id = $userId;
        $click->clicked_at = Carbon::now();
        $click->save();
    }

    /**
     * Reduce the drink log total for a user by 1 by deleting their most recent drink_click row.
     * No-op if the user has no clicks (total stays 0).
     */
    public static function decrementCountForUser(int $userId): void
    {
        if ($userId <= 0) {
            return;
        }
        $click = static::query()
            ->where('user_id', $userId)
            ->orderByDesc('clicked_at')
            ->first();
        if ($click) {
            $click->delete();
            unset(self::$totalCountCache[$userId]);
        }
    }

    /**
     * Count discussions by this user that have the given tag slug (requires flarum/tags).
     * Returns 0 if Tags is disabled or tag slug is empty.
     */
    public static function discussionCountWithLogTag(int $userId, string $tagSlug): int
    {
        $tagSlug = trim($tagSlug);
        if ($tagSlug === '') {
            return 0;
        }
        if (!class_exists(\Flarum\Tags\Tag::class)) {
            return 0;
        }
        $extensions = resolve(\Flarum\Extension\ExtensionManager::class);
        if (!$extensions->isEnabled('flarum-tags')) {
            return 0;
        }

        return (int) \Flarum\Discussion\Discussion::query()
            ->where('user_id', $userId)
            ->whereHas('tags', fn ($q) => $q->where('slug', $tagSlug))
            ->count();
    }
}
