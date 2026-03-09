<?php

namespace ZerosOnesFun\Drinks\Api\Controller;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use ZerosOnesFun\Drinks\DrinkClick;

/**
 * Decrements the current user's drink total by 1. Used as a workaround when the
 * frontend detects the Drink Logs count decreased (user hid a log discussion).
 */
class DecrementDrinkTotalController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertRegistered();

        DrinkClick::decrementCountForUser((int) $actor->id);
        $newTotal = DrinkClick::totalCountForUser((int) $actor->id);

        return new JsonResponse(['success' => true, 'newTotal' => $newTotal]);
    }
}
