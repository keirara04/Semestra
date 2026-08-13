<?php

namespace Tests\Feature;

use App\Jobs\SendNotificationEmail;
use App\Mail\NotificationMail;
use App\Models\Assessment;
use App\Models\Course;
use App\Models\Notification;
use App\Models\Semester;
use App\Models\Task;
use App\Models\Topic;
use App\Models\User;
use App\Services\NotificationGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class NotificationGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_task_with_an_infeasible_deadline_raises_a_deficit_notification(): void
    {
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 1]);
        Auth::setUser($user);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create(['due_at' => Carbon::parse('2026-05-05')]);
        Task::factory()->for($user)->for($course)->create([
            'assessment_id' => $assessment->id,
            'remaining_estimate_minutes' => 600,
            'due_at' => Carbon::parse('2026-05-05'),
            'status' => 'open',
        ]);

        $created = app(NotificationGenerator::class)->generate($user);

        $deficit = collect($created)->firstWhere('type', 'deficit_today');
        $this->assertNotNull($deficit);
        $this->assertSame('assessment', $deficit->subject_type);
        $this->assertSame($assessment->id, $deficit->subject_id);
    }

    public function test_a_stale_topic_raises_an_unreviewed_notification_once_per_week(): void
    {
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 4]);
        Auth::setUser($user);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $topic = Topic::factory()->for($user)->for($course)->create([
            'last_reviewed_at' => Carbon::parse('2026-04-20'),
        ]);

        $first = app(NotificationGenerator::class)->generate($user);
        $this->assertNotNull(collect($first)->firstWhere('type', 'topic_unreviewed'));

        $second = app(NotificationGenerator::class)->generate($user);
        $this->assertNull(collect($second)->firstWhere('type', 'topic_unreviewed'));

        $this->assertSame(1, Notification::where('type', 'topic_unreviewed')->where('subject_id', $topic->id)->count());
    }

    public function test_generation_is_idempotent_within_the_same_day(): void
    {
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 1]);
        Auth::setUser($user);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create(['due_at' => Carbon::parse('2026-05-05')]);
        Task::factory()->for($user)->for($course)->create([
            'assessment_id' => $assessment->id,
            'remaining_estimate_minutes' => 600,
            'due_at' => Carbon::parse('2026-05-05'),
            'status' => 'open',
        ]);

        $generator = app(NotificationGenerator::class);
        $first = $generator->generate($user);
        $second = $generator->generate($user);

        $this->assertNotEmpty($first);
        $this->assertEmpty($second);
        $this->assertSame(count($first), Notification::where('type', 'deficit_today')->count());
    }

    public function test_the_console_command_queues_delivery_for_every_generated_notification(): void
    {
        Queue::fake();
        $this->travelTo(Carbon::parse('2026-05-04 08:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC', 'max_study_hours_per_day' => 1]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create(['due_at' => Carbon::parse('2026-05-05')]);
        Task::factory()->for($user)->for($course)->create([
            'assessment_id' => $assessment->id,
            'remaining_estimate_minutes' => 600,
            'due_at' => Carbon::parse('2026-05-05'),
            'status' => 'open',
        ]);

        $this->artisan('notifications:generate')->assertExitCode(0);

        Queue::assertPushed(SendNotificationEmail::class);
    }

    public function test_the_notification_mail_renders_without_error(): void
    {
        $user = User::factory()->create(['timezone' => 'UTC']);
        $notification = Notification::factory()->for($user)->create([
            'type' => 'deficit_today',
            'message' => 'Smoke Test Report is at risk: about 8h short of what\'s needed before the deadline.',
        ]);

        $rendered = (new NotificationMail($notification))->render();

        $this->assertStringContainsString('Smoke Test Report is at risk', $rendered);
    }

    public function test_sending_the_notification_email_marks_it_sent(): void
    {
        Mail::fake();

        $user = User::factory()->create(['timezone' => 'UTC']);
        $notification = Notification::factory()->for($user)->create(['type' => 'deficit_today']);

        (new SendNotificationEmail($notification->id))->handle();

        $notification->refresh();
        $this->assertSame('sent', $notification->status);
        $this->assertNotNull($notification->sent_at);
        Mail::assertSent(NotificationMail::class);
    }

    public function test_a_notification_generated_during_quiet_hours_is_delayed_past_the_window(): void
    {
        Queue::fake();
        $this->travelTo(Carbon::parse('2026-05-04 23:00', 'UTC'));

        $user = User::factory()->create([
            'timezone' => 'UTC',
            'max_study_hours_per_day' => 1,
            'quiet_hours' => ['start' => '22:00', 'end' => '07:00'],
        ]);
        $semester = Semester::factory()->for($user)->create();
        $course = Course::factory()->for($user)->for($semester)->create();
        $assessment = Assessment::factory()->for($user)->for($course)->create(['due_at' => Carbon::parse('2026-05-05')]);
        Task::factory()->for($user)->for($course)->create([
            'assessment_id' => $assessment->id,
            'remaining_estimate_minutes' => 600,
            'due_at' => Carbon::parse('2026-05-05'),
            'status' => 'open',
        ]);

        $this->artisan('notifications:generate')->assertExitCode(0);

        Queue::assertPushed(SendNotificationEmail::class, function (SendNotificationEmail $job) {
            $delay = (fn () => $this->delay)->call($job);

            return $delay !== null;
        });
    }
}
