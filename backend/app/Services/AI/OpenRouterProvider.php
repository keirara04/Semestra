<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;

/**
 * OpenRouter — single OpenAI-compatible endpoint fronting many models, so
 * swapping models is a config change (services.openrouter.model_default /
 * model_important), not a code change. See "Model strategy" in
 * mdfile/AI.md.
 */
class OpenRouterProvider implements AIProvider
{
    private const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

    // Hard cap, not left to the model's/provider's default (some default
    // to the model's full context window) — "hard token budgets ... with
    // remaining budget visible to the student" in mdfile/AI.md means the
    // request itself must be bounded, not just the daily count.
    private const MAX_OUTPUT_TOKENS = 2000;

    public function generateStructuredResponse(
        string $systemPrompt,
        string $userPrompt,
        array $jsonSchema,
        string $schemaName,
        AiModelTier $tier,
    ): AIStructuredResponse {
        $model = $tier->model();

        $response = Http::withToken(config('services.openrouter.key'))
            ->timeout(30)
            ->post(self::ENDPOINT, [
                'model' => $model,
                'max_tokens' => self::MAX_OUTPUT_TOKENS,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
                'response_format' => [
                    'type' => 'json_schema',
                    'json_schema' => [
                        'name' => $schemaName,
                        'strict' => true,
                        'schema' => $jsonSchema,
                    ],
                ],
            ]);

        if ($response->failed()) {
            throw new AIProviderException("OpenRouter request failed: {$response->status()} {$response->body()}");
        }

        $rawContent = $response->json('choices.0.message.content');
        $content = is_string($rawContent) ? json_decode($rawContent, true) : null;

        if (! is_array($content)) {
            throw new AIProviderException('OpenRouter response did not contain valid structured content.');
        }

        return new AIStructuredResponse(
            content: $content,
            model: $response->json('model', $model),
            totalTokens: (int) $response->json('usage.total_tokens', 0),
        );
    }
}
