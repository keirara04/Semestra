<?php

namespace Tests\Unit\Engine;

use App\Engine\Exam\ReadinessCalculator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Golden fixture tests for exam readiness. See "Exam mode" in
 * mdfile/semester-command-center.md.
 */
class ReadinessCalculatorTest extends TestCase
{
    #[DataProvider('fixtureProvider')]
    public function test_matches_the_golden_fixture(string $fixture): void
    {
        $data = require __DIR__."/fixtures/{$fixture}.php";

        $report = (new ReadinessCalculator)->calculate($data['topic_confidences'], $data['days_remaining']);

        $actual = $report->toArray();

        foreach ($data['expected'] as $key => $value) {
            if ($value === null) {
                $this->assertNull($actual[$key], "Mismatch on {$key}");
            } else {
                $this->assertEqualsWithDelta($value, $actual[$key], 0.0001, "Mismatch on {$key}");
            }
        }
    }

    /**
     * @return array<string, array{string}>
     */
    public static function fixtureProvider(): array
    {
        return [
            'mixed confidence' => ['readiness_mixed_confidence'],
            'all confident' => ['readiness_all_confident'],
            'no topics' => ['readiness_no_topics'],
            'exam passed' => ['readiness_exam_passed'],
        ];
    }
}
