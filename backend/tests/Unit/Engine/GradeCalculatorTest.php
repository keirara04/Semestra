<?php

namespace Tests\Unit\Engine;

use App\Engine\Grade\GradeCalculator;
use App\Engine\Grade\GradeCategoryInput;
use App\Engine\Grade\GradeItemInput;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Golden fixture tests for the grade tracker — see "Grade and outcome
 * tracker" in mdfile/semester-command-center.md.
 */
class GradeCalculatorTest extends TestCase
{
    #[DataProvider('fixtureProvider')]
    public function test_matches_the_golden_fixture(string $fixture): void
    {
        $data = require __DIR__."/fixtures/{$fixture}.php";

        $items = array_map(
            fn (array $item) => new GradeItemInput(
                $item['id'],
                $item['name'],
                $item['weighting'],
                $item['max_score'],
                $item['achieved_score'],
                $item['grade_category_id'],
                $item['pass_hurdle_percent'],
            ),
            $data['items'],
        );

        $categories = array_map(
            fn (array $category) => new GradeCategoryInput(
                $category['id'],
                $category['drop_lowest_count'],
                $category['best_n'],
            ),
            $data['categories'],
        );

        $report = (new GradeCalculator)->calculate($items, $categories, $data['target_percent']);

        $actual = $report->toArray();
        $expected = $data['expected'];

        foreach (['current_standing', 'completed_weight', 'total_weight', 'ungraded_weight_percent', 'best_case', 'conservative', 'expected', 'needed_average'] as $key) {
            if ($expected[$key] === null) {
                $this->assertNull($actual[$key], "Mismatch on {$key}");
            } else {
                $this->assertEqualsWithDelta($expected[$key], $actual[$key], 0.0001, "Mismatch on {$key}");
            }
        }

        $this->assertSame($expected['weights_normalized'], $actual['weights_normalized']);
        $this->assertCount(count($expected['pass_hurdles']), $actual['pass_hurdles']);
        foreach ($expected['pass_hurdles'] as $index => $expectedHurdle) {
            $actualHurdle = $actual['pass_hurdles'][$index];
            $this->assertSame($expectedHurdle['item_name'], $actualHurdle['item_name']);
            $this->assertSame($expectedHurdle['passed'], $actualHurdle['passed']);
            $this->assertEqualsWithDelta($expectedHurdle['required_percent'], $actualHurdle['required_percent'], 0.0001);
            $this->assertEqualsWithDelta($expectedHurdle['achieved_percent'], $actualHurdle['achieved_percent'], 0.0001);
        }
    }

    /**
     * @return array<string, array{string}>
     */
    public static function fixtureProvider(): array
    {
        return [
            'partial grades' => ['grade_partial'],
            'weights not 100' => ['grade_weights_not_100'],
            'drop lowest' => ['grade_drop_lowest'],
            'pass hurdle' => ['grade_pass_hurdle'],
            'target set' => ['grade_target_set'],
        ];
    }
}
