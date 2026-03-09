<?php

namespace ZerosOnesFun\Drinks\Listeners;

use Flarum\Discussion\Event\Hidden;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Database\DatabaseManager;
use ZerosOnesFun\Drinks\DrinkClick;

/**
 * When a user "deletes" their discussion from the UI, Flarum hides it (soft delete)
 * and dispatches Hidden, not Deleting. This listener decrements their drink total
 * when they hide a discussion that has the Log tag.
 */
class DecrementDrinkLogOnDiscussionHidden
{
    public function __construct(
        protected ExtensionManager $extensions,
        protected SettingsRepositoryInterface $settings,
        protected DatabaseManager $db
    ) {
    }

    public function handle(Hidden $event): void
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

        // Use pivot table directly so we don't rely on $discussion->tags() (relationship may not be loaded)
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

        DrinkClick::decrementCountForUser($authorId);
    }
}
