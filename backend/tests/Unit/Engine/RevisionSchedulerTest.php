<?php

namespace Tests\Unit\Engine;

use App\Engine\Revision\RevisionScheduler;
use App\Engine\Revision\TopicReviewInput;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Golden fixture tests for the spaced revision engine — see "Materials,
 * notes, and revision" in mdfile/semester-command-center.md.
 */
class RevisionSchedulerTest extends TestCase
{
    #[DataProvider('fixtureProvider')]
    public function test_matches_the_golden_fixture(string $fixture): void
    {
        $data = require __DIR__."/fixtures/{$fixture}.php";

        $topics = array_map(
            fn (array $topic) => new TopicReviewInput(
                $topic['id'],
                $topic['confidence'],
                $topic['review_stage'],
                $topic['next_review_due_date'],
                $topic['has_open_review_task'],
                $topic['already_decayed_for_this_review'],
            ),
            $data['topics'],
        );

        $actions = (new RevisionScheduler)->planReviews($topics, $data['today'], $data['daily_cap_minutes']);

        $this->assertSame($data['expected'], array_map(fn ($action) => $action->toArray(), $actions));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function fixtureProvider(): array
    {
        return [
            'due today' => ['revision_due_today'],
            'not due yet' => ['revision_not_due_yet'],
            'already pending, no duplicate' => ['revision_already_pending_no_duplicate'],
            'daily cap defers' => ['revision_daily_cap_defers'],
            'missed review decays' => ['revision_missed_review_decays'],
            'decay not reapplied' => ['revision_decay_not_reapplied'],
        ];
    }
}
