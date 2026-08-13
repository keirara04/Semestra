<?php

namespace App\Engine\Capacity;

final class ClassSessionExceptionInput
{
    /**
     * @param  string  $date  "Y-m-d"
     * @param  string  $type  "cancelled"|"moved"
     */
    public function __construct(
        public readonly string $date,
        public readonly string $type,
        public readonly ?string $newStartTime = null,
        public readonly ?string $newEndTime = null,
    ) {}
}
