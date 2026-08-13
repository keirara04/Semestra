<?php

namespace Tests\Unit\Engine;

use App\Engine\Ranking\RankingCalculator;
use App\Engine\Ranking\TaskRankingInput;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Golden fixture tests for the ranking formula — see "Ranking" in
 * mdfile/semester-command-center.md.
 */
class RankingCalculatorTest extends TestCase
{
    #[DataProvider('fixtureProvider')]
    public function test_matches_the_golden_fixture(string $fixture): void
    {
        $data = require __DIR__."/fixtures/{$fixture}.php";

        $tasks = $this->buildTasks($data);
        $results = (new RankingCalculator)->rank($tasks);

        $this->assertCount(count($data['expected']), $results);

        foreach ($data['expected'] as $index => $expected) {
            $actual = $results[$index]->toArray();
            $this->assertSame($expected['task_id'], $actual['task_id']);
            $this->assertEqualsWithDelta($expected['score'], $actual['score'], 0.0001);
            foreach ($expected['factors'] as $key => $value) {
                $this->assertEqualsWithDelta($value, $actual['factors'][$key], 0.0001, "Mismatch on factor {$key}");
            }
            $this->assertSame($expected['reasons'], $actual['reasons']);
        }
    }

    public function test_results_are_sorted_by_score_descending(): void
    {
        $data = require __DIR__.'/fixtures/ranking_sorts_by_score.php';

        $tasks = $this->buildTasks($data);
        $results = (new RankingCalculator)->rank($tasks);

        $this->assertSame($data['expected_order'], array_map(fn ($result) => $result->taskId, $results));
    }

    /**
     * @return TaskRankingInput[]
     */
    private function buildTasks(array $data): array
    {
        return array_map(
            fn (array $task) => new TaskRankingInput(
                $task['id'],
                $task['remaining_minutes'],
                $task['due_date'],
                $task['available_minutes_before_due'],
                $task['grade_weight'] !== null ? (float) $task['grade_weight'] : null,
                $task['estimate_confidence'],
                $task['last_touched_at'],
                $data['now'],
                $task['topic_confidence'],
                $task['topic_last_reviewed_at'],
            ),
            $data['tasks'],
        );
    }

    /**
     * @return array<string, array{string}>
     */
    public static function fixtureProvider(): array
    {
        return [
            'urgency high' => ['ranking_urgency_high'],
            'no due date' => ['ranking_no_due_date'],
            'high impact low confidence' => ['ranking_high_impact_low_confidence'],
            'revision linked low confidence' => ['ranking_revision_linked_low_confidence'],
        ];
    }
}
