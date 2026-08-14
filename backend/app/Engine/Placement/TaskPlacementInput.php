<?php

namespace App\Engine\Placement;

/**
 * Plain input value object, no Eloquent, same "Planning engine boundary"
 * rule as the other engines. Order in the array passed to
 * PlacementCalculator::place() IS the ranking order (score descending);
 * this class doesn't carry a score itself, ranking already happened.
 */
final class TaskPlacementInput
{
    public function __construct(
        public readonly int $id,
        public readonly int $remainingMinutes,
        public readonly ?int $dependsOnTaskId,
        public readonly bool $dependencyDone,
    ) {}
}
