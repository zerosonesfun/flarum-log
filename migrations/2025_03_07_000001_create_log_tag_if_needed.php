<?php

use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        if (!$schema->hasTable('tags')) {
            return;
        }

        $connection = $schema->getConnection();
        if ($connection->table('tags')->where('slug', 'log')->exists()) {
            return;
        }

        $connection->table('tags')->insert([
            'name' => 'Log',
            'slug' => 'log',
            'description' => null,
            'color' => '#5c4d79',
            'position' => 0,
            'parent_id' => null,
            'default_sort' => null,
            'is_restricted' => 0,
            'is_hidden' => 0,
            'discussions_count' => 0,
        ]);
    },
    'down' => function (Builder $schema) {
        if (!$schema->hasTable('tags')) {
            return;
        }
        $schema->getConnection()->table('tags')->where('slug', 'log')->delete();
    },
];
