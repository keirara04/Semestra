<?php

namespace Tests\Feature;

use App\Models\CalendarBlock;
use App\Models\Course;
use App\Models\Semester;
use App\Models\StudySession;
use App\Models\User;
use App\Models\WeeklyReview;
use App\Services\WeeklyReviewGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class WeeklyReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_weekly_review_sums_planned_and_completed_minutes_for_last_week(): void
    {
        // Monday 2026-05-04 through Sunday 2026-05-10 is last week; today is the following Monday.
        $this->travelTo(Carbon::parse('2026-05-11 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 4]);
        Auth::setUser($user);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();

        $plannedBlock = CalendarBlock::factory()->for($user)->create([
            'status' => 'accepted',
            'start_at' => Carbon::parse('2026-05-05 09:00'),
            'end_at' => Carbon::parse('2026-05-05 10:30'),
        ]);
        StudySession::factory()->for($user)->create([
            'calendar_block_id' => $plannedBlock->id,
            'actual_minutes' => 60,
            'outcome' => 'completed',
            'ended_at' => Carbon::parse('2026-05-05 10:00'),
        ]);
        StudySession::factory()->for($user)->create([
            'calendar_block_id' => $plannedBlock->id,
            'actual_minutes' => 15,
            'outcome' => 'blocked',
            'blocker' => 'Sick',
            'ended_at' => Carbon::parse('2026-05-06 11:00'),
        ]);
        // Outside the window; must not be counted.
        StudySession::factory()->for($user)->create([
            'calendar_block_id' => $plannedBlock->id,
            'actual_minutes' => 999,
            'ended_at' => Carbon::parse('2026-05-11 09:00'),
        ]);

        $review = app(WeeklyReviewGenerator::class)->generate($user);

        $this->assertSame('2026-05-04', $review->week_start_date->format('Y-m-d'));
        $this->assertSame(90, $review->planned_minutes);
        $this->assertSame(75, $review->completed_minutes);
        $this->assertSame(['blocked' => 1], $review->cause_breakdown);
    }

    public function test_generating_twice_for_the_same_week_returns_the_existing_review(): void
    {
        $this->travelTo(Carbon::parse('2026-05-11 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 4]);
        Auth::setUser($user);
        Semester::factory()->for($user)->create();

        $generator = app(WeeklyReviewGenerator::class);
        $first = $generator->generate($user);
        $second = $generator->generate($user);

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, WeeklyReview::count());
    }

    public function test_the_console_command_generates_a_review_for_every_user(): void
    {
        $this->travelTo(Carbon::parse('2026-05-11 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 4]);
        Semester::factory()->for($user)->create();

        $this->artisan('reviews:generate-weekly')->assertExitCode(0);

        $this->assertDatabaseHas('weekly_reviews', [
            'user_id' => $user->id,
            'week_start_date' => '2026-05-04',
        ]);
    }

    public function test_the_latest_endpoint_returns_the_most_recent_review(): void
    {
        $this->travelTo(Carbon::parse('2026-05-11 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 4]);
        Auth::setUser($user);
        Semester::factory()->for($user)->create();
        app(WeeklyReviewGenerator::class)->generate($user);

        $this->actingAs($user, 'sanctum')->getJson('/api/weekly-reviews/latest')
            ->assertOk()
            ->assertJsonPath('week_start_date', '2026-05-04T00:00:00.000000Z');
    }
}
