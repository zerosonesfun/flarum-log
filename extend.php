<?php

namespace ZerosOnesFun\Drinks;

use Flarum\Discussion\Event\Saving;
use Flarum\Extend;
use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Api\Serializer\UserSerializer;
use ZerosOnesFun\Drinks\DrinkClick;

$eventExtender = (new Extend\Event())
    ->listen(Saving::class, Listeners\AttachLogTagToDiscussion::class)
    ->listen(Saving::class, Listeners\DecrementDrinkLogOnDiscussionHideInSaving::class)
    ->listen(\Flarum\Discussion\Event\Deleting::class, Listeners\DecrementDrinkLogOnDiscussionDelete::class)
    ->listen(\Flarum\Discussion\Event\Hidden::class, Listeners\DecrementDrinkLogOnDiscussionHidden::class)
    ->listen(\Flarum\Post\Event\Deleted::class, Listeners\DecrementDrinkLogOnPostDeleted::class);
if (class_exists(\Flarum\Discussion\Event\Hiding::class)) {
    $eventExtender->listen(\Flarum\Discussion\Event\Hiding::class, Listeners\DecrementDrinkLogOnDiscussionHiding::class);
}

return [
    $eventExtender,
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less')
        ->route('/u/{username}/drink-logs', 'zerosonesfun.drink-logs'),
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),

    (new Extend\Routes('api'))
        ->get('/flarum-log/count', 'zerosonesfun.flarum_log.count', Api\Controller\ShowDrinkCountController::class)
        ->post('/flarum-log', 'zerosonesfun.flarum_log.click', Api\Controller\RecordDrinkClickController::class)
        ->post('/flarum-log/decrement-total', 'zerosonesfun.flarum_log.decrement_total', Api\Controller\DecrementDrinkTotalController::class),

    (new Extend\Settings())
        ->default('zerosonesfun-flarum-log.button_label', '{count} Drinking')
        ->default('zerosonesfun-flarum-log.cooldown_minutes', '30')
        ->default('zerosonesfun-flarum-log.log_tag_slug', 'log')
        ->serializeToForum('drinkButtonLabel', 'zerosonesfun-flarum-log.button_label', null, '{count} Drinking')
        ->serializeToForum('drinkCooldownMinutes', 'zerosonesfun-flarum-log.cooldown_minutes', null, '30')
        ->serializeToForum('drinkLogTagSlug', 'zerosonesfun-flarum-log.log_tag_slug', null, 'log'),

    (new Extend\ApiSerializer(ForumSerializer::class))
        ->attribute('drinkCount', function (ForumSerializer $serializer) {
            $settings = resolve(\Flarum\Settings\SettingsRepositoryInterface::class);
            $minutes = (int) $settings->get('zerosonesfun-flarum-log.cooldown_minutes', 30) ?: 30;
            $minutes = max(1, min(1440, $minutes));
            return DrinkClick::currentCount($minutes);
        })
        ->attribute('drinkDirectLinksEnabled', function (ForumSerializer $serializer) {
            $extensions = resolve(\Flarum\Extension\ExtensionManager::class);
            return $extensions->isEnabled('fof-direct-links');
        })
        ->attribute('drinkLogTagId', function (ForumSerializer $serializer) {
            $extensions = resolve(\Flarum\Extension\ExtensionManager::class);
            if (!$extensions->isEnabled('flarum-tags') || !class_exists(\Flarum\Tags\Tag::class)) {
                return null;
            }
            $settings = resolve(\Flarum\Settings\SettingsRepositoryInterface::class);
            $tagSlug = trim((string) $settings->get('zerosonesfun-flarum-log.log_tag_slug', 'log'));
            if ($tagSlug === '') {
                return null;
            }
            $tag = \Flarum\Tags\Tag::query()->where('slug', $tagSlug)->first();

            return $tag ? (int) $tag->id : null;
        }),

    (new Extend\ApiSerializer(UserSerializer::class))
        ->attribute('drinkLogTotal', function (UserSerializer $serializer, $user) {
            return DrinkClick::totalCountForUser((int) $user->id);
        })
        ->attribute('drinkLogDiscussionsCount', function (UserSerializer $serializer, $user) {
            $settings = resolve(\Flarum\Settings\SettingsRepositoryInterface::class);
            $tagSlug = trim((string) $settings->get('zerosonesfun-flarum-log.log_tag_slug', 'log'));
            return DrinkClick::discussionCountWithLogTag((int) $user->id, $tagSlug);
        }),

    (new Extend\Locales(__DIR__ . '/locale')),
];
