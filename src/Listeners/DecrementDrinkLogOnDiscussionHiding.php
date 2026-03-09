<?php

namespace ZerosOnesFun\Drinks\Listeners;

use Flarum\Discussion\Event\Hiding;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;
use ZerosOnesFun\Drinks\DrinkClick;

/**
 * Fired *before* the discussion is actually hidden. Most reliable place to decrement:
 * discussion still exists, not yet hidden, we can check tags and decrement.
 */
class DecrementDrinkLogOnDiscussionHiding
{
    public function __construct(
        protected ExtensionManager $extensions,
        protected SettingsRepositoryInterface $settings
    ) {
    }

    public function handle(Hiding $event): void
    {
        $discussion = $event->discussion;

        if (!$this->extensions->isEnabled('flarum-tags') || !class_exists(\Flarum\Tags\Tag::class)) {
            return;
        }

        $tagSlug = trim((string) $this->settings->get('zerosonesfun-flarum-log.log_tag_slug', 'log'));
        if ($tagSlug === '') {
            return;
        }

        $authorId = (int) $discussion->user_id;
        if ($authorId <= 0) {
            return;
        }

        $hasLogTag = \Flarum\Tags\Tag::query()
            ->where('slug', $tagSlug)
            ->whereHas('discussions', fn ($q) => $q->where('discussions.id', $discussion->id))
            ->exists();
        if (!$hasLogTag) {
            return;
        }

        DrinkClick::decrementCountForUserIfLogDiscussion((int) $discussion->id, $authorId);
    }
}
