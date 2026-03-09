<?php

namespace ZerosOnesFun\Drinks\Listeners;

use Flarum\Discussion\Event\Hidden;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;
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
        protected SettingsRepositoryInterface $settings
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

        $hasLogTag = $discussion->tags()->where('slug', $tagSlug)->exists();
        if (!$hasLogTag) {
            return;
        }

        DrinkClick::decrementCountForUser($authorId);
    }
}
