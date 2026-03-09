<?php

namespace ZerosOnesFun\Drinks\Listeners;

use Flarum\Discussion\Event\Saving;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;
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
        protected SettingsRepositoryInterface $settings
    ) {
    }

    public function handle(Saving $event): void
    {
        $discussion = $event->discussion;

        if (!$discussion->exists) {
            return;
        }

        // Detect: discussion is being hidden. Frontend sends PATCH with attributes.isHidden = true.
        // Backend may set hidden_at on the model; also check request attributes (isHidden, hiddenAt, hidden_at).
        $wasHidden = $discussion->getOriginal('hidden_at');
        $attrs = $event->data['attributes'] ?? [];
        $requestSaysHidden = ($attrs['isHidden'] === true || $attrs['isHidden'] === 'true'
            || $attrs['is_hidden'] === true || $attrs['is_hidden'] === 'true')
            || isset($attrs['hiddenAt']) && $attrs['hiddenAt'] !== null
            || isset($attrs['hidden_at']) && $attrs['hidden_at'] !== null;
        $modelSaysHidden = $discussion->hidden_at !== null;
        if ($wasHidden !== null || (!$requestSaysHidden && !$modelSaysHidden)) {
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

        // Use Discussion's tags() relationship (avoids hardcoding pivot table name)
        $hasLogTag = $discussion->tags()->where('slug', $tagSlug)->exists();
        if (!$hasLogTag) {
            return;
        }

        DrinkClick::decrementCountForUserIfLogDiscussion((int) $discussion->id, $authorId);
    }
}
