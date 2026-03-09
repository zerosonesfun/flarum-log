<?php

namespace ZerosOnesFun\Drinks\Listeners;

use Flarum\Discussion\Event\Saving;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Database\DatabaseManager;
use ZerosOnesFun\Drinks\DrinkClick;

/**
 * When a discussion is soft-deleted via the UI, Flarum often PATCHes it with hiddenAt set,
 * which triggers Saving (not necessarily Hidden). This listener detects that transition
 * and decrements the author's drink total for log-tagged discussions.
 */
class DecrementDrinkLogOnDiscussionHideInSaving
{
    public function __construct(
        protected ExtensionManager $extensions,
        protected SettingsRepositoryInterface $settings,
        protected DatabaseManager $db
    ) {
    }

    public function handle(Saving $event): void
    {
        $discussion = $event->discussion;

        if (!$discussion->exists) {
            return;
        }

        // Detect: hidden_at is being set (was null, now not null)
        // Check both model and request data (controller may set from $event->data)
        $wasHidden = $discussion->getOriginal('hidden_at');
        $nowHidden = $discussion->hidden_at
            ?? (isset($event->data['attributes']['hiddenAt']) ? $event->data['attributes']['hiddenAt'] : null);
        if ($wasHidden !== null || $nowHidden === null) {
            return;
        }

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

        $tag = \Flarum\Tags\Tag::query()->where('slug', $tagSlug)->first();
        if (!$tag) {
            return;
        }
        $hasLogTag = $this->db->table('discussion_tag')
            ->where('discussion_id', $discussion->id)
            ->where('tag_id', $tag->id)
            ->exists();
        if (!$hasLogTag) {
            return;
        }

        DrinkClick::decrementCountForUserIfLogDiscussion((int) $discussion->id, $authorId);
    }
}
