<?php

namespace App\Engine\Grade;

/**
 * Drop-lowest / best-N-of-M rule for an assessment-group, declared at
 * course setup, see "Grade and outcome tracker" in
 * mdfile/semester-command-center.md.
 */
final class GradeCategoryInput
{
    public function __construct(
        public readonly int $id,
        public readonly ?int $dropLowestCount,
        public readonly ?int $bestN,
    ) {}
}
