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

        // Detect: discussion is being hidden. data may be at attributes or data.attributes (JSON:API).
        $wasHidden = $discussion->getOriginal('hidden_at');
        $attrs = $event->data['attributes'] ?? $event->data['data']['attributes'] ?? [];
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

        // Check from Tag side: tag with this slug has this discussion
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
