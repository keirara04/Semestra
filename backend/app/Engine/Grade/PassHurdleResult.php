<?php

namespace App\Engine\Grade;

final class PassHurdleResult
{
    public function __construct(
        public readonly string $itemName,
        public readonly float $requiredPercent,
        public readonly ?float $achievedPercent,
        public readonly bool $passed,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'item_name' => $this->itemName,
            'required_percent' => $this->requiredPercent,
            'achieved_percent' => $this->achievedPercent,
            'passed' => $this->passed,
        ];
    }
}
