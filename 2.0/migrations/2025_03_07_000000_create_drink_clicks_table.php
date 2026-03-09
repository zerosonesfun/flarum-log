<?php

use Flarum\Database\Migration;
use Illuminate\Database\Schema\Blueprint;

return Migration::createTable('drink_clicks', function (Blueprint $table) {
    $table->increments('id');
    $table->unsignedInteger('user_id');
    $table->dateTime('clicked_at');
    $table->index(['user_id', 'clicked_at']);
    $table->index('clicked_at');
});
