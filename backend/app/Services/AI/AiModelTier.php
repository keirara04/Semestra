<?php

namespace App\Services\AI;

/**
 * Two-tier model selection, not one expensive model for everything —
 * callers pick a tier by what the task is worth, never a raw model
 * string. See "Model strategy" in mdfile/AI.md.
 */
enum AiModelTier: string
{
    // Cheap/fast — explanations, request parsing, rewriting, simple
    // multilingual responses.
    case Default = 'default';

    // Stronger reasoning — syllabus extraction, ambiguous/multilingual
    // text, conversational replanning.
    case Important = 'important';

    public function model(): string
    {
        return match ($this) {
            self::Default => config('services.openrouter.model_default'),
            self::Important => config('services.openrouter.model_important'),
        };
    }
}
