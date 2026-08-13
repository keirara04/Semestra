<?php

namespace App\Engine\Placement;

final class TaskPlacementResult
{
    /**
     * @param  PlacedBlock[]  $blocks
     */
    public function __construct(
        public readonly int $taskId,
        public readonly array $blocks,
        public readonly int $unplacedMinutes,
        public readonly bool $skippedForDependency,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'task_id' => $this->taskId,
            'blocks' => array_map(fn (PlacedBlock $block) => $block->toArray(), $this->blocks),
            'unplaced_minutes' => $this->unplacedMinutes,
            'skipped_for_dependency' => $this->skippedForDependency,
        ];
    }
}
