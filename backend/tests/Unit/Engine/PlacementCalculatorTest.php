<?php

namespace Tests\Unit\Engine;

use App\Engine\Placement\PlacementCalculator;
use App\Engine\Placement\TaskPlacementInput;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Golden fixture tests for placement — see "Placement" in
 * mdfile/semester-command-center.md.
 */
class PlacementCalculatorTest extends TestCase
{
    #[DataProvider('fixtureProvider')]
    public function test_matches_the_golden_fixture(string $fixture): void
    {
        $data = require __DIR__."/fixtures/{$fixture}.php";

        $tasks = array_map(
            fn (array $task) => new TaskPlacementInput(
                $task['id'],
                $task['remaining_minutes'],
                $task['depends_on_task_id'],
                $task['dependency_done'],
            ),
            $data['tasks'],
        );

        $results = (new PlacementCalculator)->place($tasks, $data['capacity_by_date'], $data['day_start_time']);

        $this->assertSame($data['expected'], array_map(fn ($result) => $result->toArray(), $results));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function fixtureProvider(): array
    {
        return [
            'basic' => ['placement_basic'],
            'max splits' => ['placement_max_splits'],
            'min block skips small day' => ['placement_min_block_skips_small_day'],
            'dependency unresolved' => ['placement_dependency_unresolved'],
            'dependency resolved orders after' => ['placement_dependency_resolved_orders_after'],
        ];
    }
}
