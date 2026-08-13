<?php

namespace Tests\Unit\Engine;

use App\Engine\Capacity\CapacityCalculator;
use App\Engine\Capacity\ClassSessionExceptionInput;
use App\Engine\Capacity\ClassSessionInput;
use App\Engine\Capacity\CommitmentInput;
use App\Engine\Capacity\DateRangeExclusion;
use DateTimeImmutable;
use DateTimeZone;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Golden fixture tests for the capacity engine — see "Planning engine
 * boundary" in the plan and the Phase 3 risk note: "every downstream
 * number is wrong if this is wrong."
 */
class CapacityCalculatorTest extends TestCase
{
    #[DataProvider('fixtureProvider')]
    public function test_matches_the_golden_fixture(string $fixture): void
    {
        $data = require __DIR__."/fixtures/{$fixture}.php";

        $classSessions = array_map(
            fn (array $session) => new ClassSessionInput(
                $session['day_of_week'],
                $session['start_time'],
                $session['end_time'],
                array_map(
                    fn (array $exception) => new ClassSessionExceptionInput(
                        $exception['date'],
                        $exception['type'],
                        $exception['new_start_time'] ?? null,
                        $exception['new_end_time'] ?? null,
                    ),
                    $session['exceptions'],
                ),
            ),
            $data['class_sessions'],
        );

        $commitments = array_map(
            fn (array $commitment) => new CommitmentInput(
                $commitment['day_of_week'],
                $commitment['date'],
                $commitment['start_time'],
                $commitment['end_time'],
            ),
            $data['commitments'],
        );

        $breaks = array_map(
            fn (array $break) => new DateRangeExclusion($break['start_date'], $break['end_date']),
            $data['breaks'],
        );

        $timezone = new DateTimeZone($data['timezone']);
        $days = (new CapacityCalculator)->calculate(
            $classSessions,
            $commitments,
            $breaks,
            $data['max_study_hours_per_day'],
            $timezone,
            new DateTimeImmutable($data['from'], $timezone),
            new DateTimeImmutable($data['to'], $timezone),
        );

        $this->assertSame(array_keys($data['expected']), array_map(fn ($day) => $day->date, $days));

        foreach ($days as $day) {
            $actual = $day->toArray();
            unset($actual['date']);
            $this->assertSame($data['expected'][$day->date], $actual, "Mismatch on {$day->date}");
        }
    }

    /**
     * @return array<string, array{string}>
     */
    public static function fixtureProvider(): array
    {
        return [
            'DST week' => ['dst_week'],
            'holiday week' => ['holiday_week'],
            'fully booked day' => ['fully_booked_day'],
            'overnight commitment' => ['overnight_commitment'],
        ];
    }
}
