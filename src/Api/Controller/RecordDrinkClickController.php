<?php

namespace ZerosOnesFun\Drinks\Api\Controller;

use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Database\Connection;
use Illuminate\Database\DatabaseManager;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use ZerosOnesFun\Drinks\DrinkClick;

class RecordDrinkClickController implements RequestHandlerInterface
{
    public function __construct(
        protected SettingsRepositoryInterface $settings,
        protected DatabaseManager $db
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);

        $actor->assertRegistered();

        $minutes = (int) $this->settings->get('zerosonesfun-flarum-log.cooldown_minutes', 30) ?: 30;
        $minutes = max(1, min(1440, $minutes)); // 1 min to 24 hours

        $connection = $this->db->connection();

        return $connection->transaction(function () use ($connection, $actor, $minutes) {
            $this->acquireUserLock($connection, $actor->id);

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

            $userTotal = DrinkClick::totalCountForUser($actor->id);

            return new JsonResponse([
                'data' => [
                    'count' => $count,
                    'recorded' => true,
                    'userTotal' => $userTotal,
                ],
            ]);
        });
    }

    /**
     * Lock the row for this user in drink_click_locks so concurrent requests are serialized.
     */
    private function acquireUserLock(Connection $connection, int $userId): void
    {
        $connection->table('drink_click_locks')->insertOrIgnore([['user_id' => $userId]]);
        $connection->table('drink_click_locks')->where('user_id', $userId)->lockForUpdate()->first();
    }
}
