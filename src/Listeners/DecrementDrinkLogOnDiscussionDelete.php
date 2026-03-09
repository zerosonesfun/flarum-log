<?php

namespace ZerosOnesFun\Drinks\Listeners;

use Flarum\Discussion\Event\Deleting;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Database\DatabaseManager;
use ZerosOnesFun\Drinks\DrinkClick;

class DecrementDrinkLogOnDiscussionDelete
{
    public function __construct(
        protected ExtensionManager $extensions,
        protected SettingsRepositoryInterface $settings,
        protected DatabaseManager $db
    ) {
    }

    public function handle(Deleting $event): void
    {
        $discussion = $event->discussion;

        // Already hidden: we decremented when Hidden fired. Skip to avoid double decrement.
        if ($discussion->hidden_at !== null) {
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

        DrinkClick::decrementCountForUserIfLogDiscussion((int) $discussion->id, $authorId);
    }
}
