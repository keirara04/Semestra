<?php

namespace App\Engine\Placement;

final class PlacedBlock
{
    public function __construct(
        public readonly string $date, // "Y-m-d"
        public readonly string $startTime, // "H:i"
        public readonly string $endTime, // "H:i"
        public readonly int $minutes,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'date' => $this->date,
            'start_time' => $this->startTime,
            'end_time' => $this->endTime,
            'minutes' => $this->minutes,
        ];
    }
}
