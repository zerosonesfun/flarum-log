<?php

namespace ZerosOnesFun\Drinks\Listeners;

use Flarum\Extension\ExtensionManager;
use Flarum\Post\Event\Deleted as PostDeleted;
use Flarum\Settings\SettingsRepositoryInterface;
use ZerosOnesFun\Drinks\DrinkClick;

/**
 * When a post is deleted, if it's the first post of a discussion (the discussion
 * content), check if that discussion had the Log tag and decrement the author's
 * drink total. Some flows may fire this instead of or in addition to Discussion\Hidden.
 */
class DecrementDrinkLogOnPostDeleted
{
    public function __construct(
        protected ExtensionManager $extensions,
        protected SettingsRepositoryInterface $settings
    ) {
    }

    public function handle(PostDeleted $event): void
    {
        $post = $event->post;

        if (!$this->extensions->isEnabled('flarum-tags') || !class_exists(\Flarum\Tags\Tag::class)) {
            return;
        }

        $tagSlug = trim((string) $this->settings->get('zerosonesfun-flarum-log.log_tag_slug', 'log'));
        if ($tagSlug === '') {
            return;
        }

        $discussionId = (int) $post->discussion_id;
        if ($discussionId <= 0) {
            return;
        }

        $discussion = \Flarum\Discussion\Discussion::find($discussionId);
        if (!$discussion) {
            return;
        }

        $isFirstPost = (int) $post->number === 1 || (int) $discussion->first_post_id === (int) $post->id;
        if (!$isFirstPost) {
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

        DrinkClick::decrementCountForUserIfLogDiscussion($discussionId, $authorId);
    }
}
