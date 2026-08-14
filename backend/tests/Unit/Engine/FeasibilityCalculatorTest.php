<?php

namespace Tests\Unit\Engine;

use App\Engine\Planning\FeasibilityCalculator;
use App\Engine\Planning\TaskDemandInput;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Golden fixture tests for the feasibility pass. See "Smart study
 * planner" (pipeline steps 2-4) in mdfile/semester-command-center.md.
 */
class FeasibilityCalculatorTest extends TestCase
{
    #[DataProvider('fixtureProvider')]
    public function test_matches_the_golden_fixture(string $fixture): void
    {
        $data = require __DIR__."/fixtures/{$fixture}.php";

        $tasks = array_map(
            fn (array $task) => new TaskDemandInput($task['id'], $task['remaining_minutes'], $task['due_date']),
            $data['tasks'],
        );

        $report = (new FeasibilityCalculator)->calculate($tasks, $data['capacity_by_date'], $data['today']);

        $this->assertSame($data['expected'], $report->toArray());
    }

    /**
     * @return array<string, array{string}>
     */
    public static function fixtureProvider(): array
    {
        return [
            'single task fits' => ['feasibility_single_task_fits'],
            'two competing deadlines' => ['feasibility_two_competing_deadlines'],
            'infeasible deficit' => ['feasibility_infeasible_deficit'],
        ];
    }
}
