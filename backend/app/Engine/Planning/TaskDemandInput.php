<?php

namespace App\Engine\Planning;

/**
 * Plain input value object — no Eloquent, same "Planning engine boundary"
 * rule as the capacity/grade engines (see
 * mdfile/semester-command-center.md).
 */
final class TaskDemandInput
{
    /**
     * @param  string|null  $dueDate  "Y-m-d". Null means flexible work —
     *                                not mandatory, excluded from the
     *                                feasibility pass entirely (see
     *                                FeasibilityCalculator).
     */
    public function __construct(
        public readonly int $id,
        public readonly int $remainingMinutes,
        public readonly ?string $dueDate,
    ) {}
}
