<?php

namespace App\Engine\Capacity;

final class DayCapacity
{
    public function __construct(
        public readonly string $date, // "Y-m-d"
        public readonly int $dayOfWeek,
        public readonly bool $isBreak,
        public readonly int $lectureMinutes,
        public readonly int $commitmentMinutes,
        public readonly int $availableMinutes,
        public readonly int $recommendedStudyMinutes,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'date' => $this->date,
            'day_of_week' => $this->dayOfWeek,
            'is_break' => $this->isBreak,
            'lecture_minutes' => $this->lectureMinutes,
            'commitment_minutes' => $this->commitmentMinutes,
            'available_minutes' => $this->availableMinutes,
            'recommended_study_minutes' => $this->recommendedStudyMinutes,
        ];
    }
}
