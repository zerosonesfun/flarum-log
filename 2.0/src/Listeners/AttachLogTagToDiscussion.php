<?php

namespace ZerosOnesFun\Drinks\Listeners;

use Flarum\Discussion\Event\Saving;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Support\Arr;
use ZerosOnesFun\Drinks\DrinkClick;

class AttachLogTagToDiscussion
{
    public function __construct(
        protected ExtensionManager $extensions,
        protected SettingsRepositoryInterface $settings
    ) {
    }

    public function handle(Saving $event): void
    {
        $discussion = $event->discussion;

        if ($discussion->exists) {
            return;
        }

        if (!$this->extensions->isEnabled('flarum-tags')) {
            return;
        }

        $tagSlug = trim((string) $this->settings->get('zerosonesfun-flarum-log.log_tag_slug', 'log'));
        if ($tagSlug === '') {
            return;
        }

        $tag = \Flarum\Tags\Tag::query()->where('slug', $tagSlug)->first();
        if (!$tag) {
            return;
        }

        $tagsData = Arr::get($event->data, 'relationships.tags.data', []);
        $tagIds = array_map(fn ($t) => $t['id'], $tagsData);
        $userAlreadyHadLogTag = in_array((string) $tag->id, $tagIds, true);
        $isLogTitle = str_starts_with((string) $discussion->title, 'Log - ');

        if ($userAlreadyHadLogTag && !$isLogTitle) {
            $authorId = (int) $discussion->user_id;
            if ($authorId > 0) {
                DrinkClick::recordClickWithoutCooldown($authorId);
            }
        }

        if ($isLogTitle) {
            if (!$userAlreadyHadLogTag) {
                $tagsData[] = ['type' => 'tags', 'id' => (string) $tag->id];
                if (!isset($event->data['relationships'])) {
                    $event->data['relationships'] = [];
                }
                if (!isset($event->data['relationships']['tags'])) {
                    $event->data['relationships']['tags'] = ['data' => []];
                }
                $event->data['relationships']['tags']['data'] = $tagsData;
            }
        }
    }
}
