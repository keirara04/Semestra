<?php

namespace App\Services\AI;

/**
 * Plain value object — no Eloquent. The model's response, already
 * validated against the requested JSON schema by the provider.
 */
final class AIStructuredResponse
{
    /**
     * @param  array<string, mixed>  $content
     */
    public function __construct(
        public readonly array $content,
        public readonly string $model,
        public readonly int $totalTokens,
    ) {}
}
