<?php

namespace ZerosOnesFun\Drinks\Api\Controller;

use Flarum\Settings\SettingsRepositoryInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use ZerosOnesFun\Drinks\DrinkClick;

class ShowDrinkCountController implements RequestHandlerInterface
{
    public function __construct(
        protected SettingsRepositoryInterface $settings
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $minutes = (int) $this->settings->get('zerosonesfun-flarum-log.cooldown_minutes', 30) ?: 30;
        $minutes = max(1, min(1440, $minutes));

        $count = DrinkClick::currentCount($minutes);

        return new JsonResponse(['data' => ['count' => $count]]);
    }
}
