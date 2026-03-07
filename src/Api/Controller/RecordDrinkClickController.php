<?php

namespace ZerosOnesFun\Drinks\Api\Controller;

use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use ZerosOnesFun\Drinks\DrinkClick;

class RecordDrinkClickController implements RequestHandlerInterface
{
    public function __construct(
        protected SettingsRepositoryInterface $settings
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);

        $actor->assertRegistered();

        $minutes = (int) $this->settings->get('zerosonesfun-flarum-log.cooldown_minutes', 30) ?: 30;
        $minutes = max(1, min(1440, $minutes)); // 1 min to 24 hours

        $recorded = DrinkClick::recordClick($actor->id, $minutes);
        $count = DrinkClick::currentCount($minutes);

        if (!$recorded) {
            return new JsonResponse([
                'data' => [
                    'count' => $count,
                    'recorded' => false,
                    'message' => 'cooldown',
                ],
            ], 429);
        }

        return new JsonResponse([
            'data' => [
                'count' => $count,
                'recorded' => true,
            ],
        ]);
    }
}
