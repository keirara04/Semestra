<?php

namespace App\Engine\Capacity;

final class CommitmentInput
{
    /**
     * Either $dayOfWeek (weekly pattern) or $date (one-off) is set, never
     * both — see "commitments" migration.
     *
     * @param  string  $startTime  "H:i"
     * @param  string  $endTime  "H:i"
     */
    public function __construct(
        public readonly ?int $dayOfWeek,
        public readonly ?string $date,
        public readonly string $startTime,
        public readonly string $endTime,
    ) {}

    public function appliesOn(string $date, int $dayOfWeek): bool
    {
        if ($this->date !== null) {
            return $this->date === $date;
        }

        return $this->dayOfWeek === $dayOfWeek;
    }
}
