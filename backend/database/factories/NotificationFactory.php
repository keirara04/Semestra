<?php

namespace Database\Factories;

use App\Models\Notification;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Notification>
 */
class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    public function definition(): array
    {
        return [
            'type' => 'deficit_today',
            'idempotency_key' => Str::uuid()->toString(),
            'message' => $this->faker->sentence(),
        ];
    }
}
