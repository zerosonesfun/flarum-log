<?php

namespace ZerosOnesFun\Drinks;

use Carbon\Carbon;
use Flarum\Database\AbstractModel;
use Flarum\User\User;

class DrinkClick extends AbstractModel
{
    protected $table = 'drink_clicks';

    public $timestamps = false;

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
}
