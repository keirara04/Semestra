<?php

namespace App\Engine\Capacity;

/**
 * Plain input value object, no Eloquent. See "Planning engine boundary"
 * in the plan: capacity math lives in a framework-agnostic module,
 * covered by fixture-based unit tests, never duplicated by controllers.
 */
final class ClassSessionInput
{
    /**
     * @param  int  $dayOfWeek  0 = Sunday .. 6 = Saturday
     * @param  string  $startTime  "H:i"
     * @param  string  $endTime  "H:i"
     * @param  ClassSessionExceptionInput[]  $exceptions
     */
    public function __construct(
        public readonly int $dayOfWeek,
        public readonly string $startTime,
        public readonly string $endTime,
        public readonly array $exceptions = [],
    ) {}

    public function exceptionOn(string $date): ?ClassSessionExceptionInput
    {
        foreach ($this->exceptions as $exception) {
            if ($exception->date === $date) {
                return $exception;
            }
        }

        return null;
    }
}
