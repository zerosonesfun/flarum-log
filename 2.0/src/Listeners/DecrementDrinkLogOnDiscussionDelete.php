<?php

namespace ZerosOnesFun\Drinks\Listeners;

use Flarum\Discussion\Event\Deleting;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;
use ZerosOnesFun\Drinks\DrinkClick;

class DecrementDrinkLogOnDiscussionDelete
{
    public function __construct(
        protected ExtensionManager $extensions,
        protected SettingsRepositoryInterface $settings
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

        // Check if this discussion has the Log tag (relationship still loaded before delete)
        $hasLogTag = $discussion->tags()->where('slug', $tagSlug)->exists();
        if (!$hasLogTag) {
            return;
        }

        DrinkClick::decrementCountForUser($authorId);
    }
}
