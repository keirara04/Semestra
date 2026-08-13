<?php

namespace App\Services\AI;

/**
 * See "Model strategy" in mdfile/AI.md — a provider adapter so the
 * product is not locked to one model company. Every implementation must
 * return validated structured output, never freeform text the caller has
 * to hope is well-formed JSON.
 */
interface AIProvider
{
    /**
     * @param  array<string, mixed>  $jsonSchema  JSON Schema the response must validate against.
     */
    public function generateStructuredResponse(
        string $systemPrompt,
        string $userPrompt,
        array $jsonSchema,
        string $schemaName,
        AiModelTier $tier,
    ): AIStructuredResponse;
}
