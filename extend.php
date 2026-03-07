<?php

namespace ZerosOnesFun\Drinks;

use Flarum\Discussion\Event\Saving;
use Flarum\Extend;
use Flarum\Api\Serializer\ForumSerializer;
use ZerosOnesFun\Drinks\DrinkClick;

return [
    (new Extend\Event())
        ->listen(Saving::class, Listeners\AttachLogTagToDiscussion::class),
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),
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
        }),

    (new Extend\Locales(__DIR__ . '/locale')),
];
