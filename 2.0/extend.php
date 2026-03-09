<?php

namespace ZerosOnesFun\Drinks;

use Flarum\Discussion\Event\Saving;
use Flarum\Extend;
use Flarum\User\User;
use Tobyz\JsonApiServer\Context;
use ZerosOnesFun\Drinks\DrinkClick;

return [
    (new Extend\Event())
        ->listen(Saving::class, Listeners\AttachLogTagToDiscussion::class)
        ->listen(\Flarum\Discussion\Event\Deleting::class, Listeners\DecrementDrinkLogOnDiscussionDelete::class),

    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less')
        ->route('/u/{username}/drink-logs', 'zerosonesfun.drink-logs'),
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),

    (new Extend\Routes('api'))
        ->get('/flarum-log/count', 'zerosonesfun.flarum_log.count', Api\Controller\ShowDrinkCountController::class)
        ->post('/flarum-log', 'zerosonesfun.flarum_log.click', Api\Controller\RecordDrinkClickController::class),

    (new Extend\Settings())
        ->default('zerosonesfun-flarum-log.button_label', '{count} Drinking')
        ->default('zerosonesfun-flarum-log.cooldown_minutes', '30')
        ->default('zerosonesfun-flarum-log.log_tag_slug', 'log')
        ->serializeToForum('drinkButtonLabel', 'zerosonesfun-flarum-log.button_label', null, '{count} Drinking')
        ->serializeToForum('drinkCooldownMinutes', 'zerosonesfun-flarum-log.cooldown_minutes', null, '30')
        ->serializeToForum('drinkLogTagSlug', 'zerosonesfun-flarum-log.log_tag_slug', null, 'log'),

    // Flarum 2.0: ApiSerializer removed; use ApiResource to add attributes to Forum and User.
    (new Extend\ApiResource(\Flarum\Api\Resource\ForumResource::class))
        ->fields(fn () => [
            \Tobyz\JsonApiServer\Schema\Number::make('drinkCount')
                ->get(function (object $forum, Context $context) {
                    $settings = resolve(\Flarum\Settings\SettingsRepositoryInterface::class);
                    $minutes = (int) $settings->get('zerosonesfun-flarum-log.cooldown_minutes', 30) ?: 30;
                    $minutes = max(1, min(1440, $minutes));
                    return DrinkClick::currentCount($minutes);
                }),
            \Tobyz\JsonApiServer\Schema\Boolean::make('drinkDirectLinksEnabled')
                ->get(function (object $forum, Context $context) {
                    $extensions = resolve(\Flarum\Extension\ExtensionManager::class);
                    return $extensions->isEnabled('fof-direct-links');
                }),
            \Tobyz\JsonApiServer\Schema\Number::make('drinkLogTagId')
                ->get(function (object $forum, Context $context) {
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
        ]),

    (new Extend\ApiResource(\Flarum\Api\Resource\UserResource::class))
        ->fields(fn () => [
            \Tobyz\JsonApiServer\Schema\Number::make('drinkLogTotal')
                ->get(function (User $user, Context $context) {
                    return DrinkClick::totalCountForUser((int) $user->id);
                }),
            \Tobyz\JsonApiServer\Schema\Number::make('drinkLogDiscussionsCount')
                ->get(function (User $user, Context $context) {
                    $settings = resolve(\Flarum\Settings\SettingsRepositoryInterface::class);
                    $tagSlug = trim((string) $settings->get('zerosonesfun-flarum-log.log_tag_slug', 'log'));
                    return DrinkClick::discussionCountWithLogTag((int) $user->id, $tagSlug);
                }),
        ]),

    (new Extend\Locales(__DIR__ . '/locale')),
];
