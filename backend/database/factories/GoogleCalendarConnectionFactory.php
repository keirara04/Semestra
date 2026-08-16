<?php

namespace Database\Factories;

use App\Models\GoogleCalendarConnection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GoogleCalendarConnection>
 */
class GoogleCalendarConnectionFactory extends Factory
{
    protected $model = GoogleCalendarConnection::class;

    public function definition(): array
    {
        return [
            'access_token' => 'fake-access-token',
            'refresh_token' => 'fake-refresh-token',
            'expires_at' => now()->addHour(),
            'google_calendar_id' => 'primary',
            'sync_token' => null,
            'last_synced_at' => null,
        ];
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'expires_at' => now()->subMinute(),
        ]);
    }
}
