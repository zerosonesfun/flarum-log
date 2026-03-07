<?php

namespace ZerosOnesFun\Drinks\Listeners;

use Flarum\Discussion\Event\Saving;
use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Support\Arr;

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

        if (!str_starts_with((string) $discussion->title, 'Log - ')) {
            return;
        }

        if (!$this->extensions->isEnabled('flarum-tags')) {
            return;
        }

        $tagSlug = (string) $this->settings->get('zerosonesfun-flarum-log.log_tag_slug', 'log');
        $tagSlug = $tagSlug !== '' ? $tagSlug : 'log';

        $tag = \Flarum\Tags\Tag::query()->where('slug', $tagSlug)->first();
        if (!$tag) {
            return;
        }

        $tagsData = Arr::get($event->data, 'relationships.tags.data', []);
        $tagIds = array_map(fn ($t) => $t['id'], $tagsData);
        if (in_array((string) $tag->id, $tagIds, true)) {
            return;
        }

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
