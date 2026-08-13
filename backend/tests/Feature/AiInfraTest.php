<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AI\AiBudgetExceededException;
use App\Services\AI\AiBudgetService;
use App\Services\AI\AiModelTier;
use App\Services\AI\AIProviderException;
use App\Services\AI\OpenRouterProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiInfraTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_provider_returns_structured_content_from_a_successful_response(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'model' => 'openai/gpt-4o-mini',
                'choices' => [
                    ['message' => ['content' => json_encode(['assessments' => []])]],
                ],
                'usage' => ['total_tokens' => 123],
            ]),
        ]);

        $response = app(OpenRouterProvider::class)->generateStructuredResponse(
            'system prompt',
            'user prompt',
            ['type' => 'object'],
            'syllabus_extraction',
            AiModelTier::Important,
        );

        $this->assertSame(['assessments' => []], $response->content);
        $this->assertSame(123, $response->totalTokens);
    }

    public function test_the_provider_raises_on_a_failed_request(): void
    {
        Http::fake(['openrouter.ai/*' => Http::response('server error', 500)]);

        $this->expectException(AIProviderException::class);

        app(OpenRouterProvider::class)->generateStructuredResponse('s', 'u', ['type' => 'object'], 'x', AiModelTier::Default);
    }

    public function test_the_provider_raises_when_content_is_not_valid_json(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'model' => 'openai/gpt-4o-mini',
                'choices' => [['message' => ['content' => 'not json']]],
                'usage' => ['total_tokens' => 5],
            ]),
        ]);

        $this->expectException(AIProviderException::class);

        app(OpenRouterProvider::class)->generateStructuredResponse('s', 'u', ['type' => 'object'], 'x', AiModelTier::Default);
    }

    public function test_budget_blocks_a_request_once_the_daily_limit_is_reached(): void
    {
        config(['services.openrouter.daily_request_limit' => 2]);

        $user = User::factory()->create(['timezone' => 'UTC']);
        Auth::setUser($user);
        $budget = app(AiBudgetService::class);

        $this->assertSame(2, $budget->remaining($user));
        $budget->recordUsage($user, 100);
        $this->assertSame(1, $budget->remaining($user));
        $budget->recordUsage($user, 100);
        $this->assertSame(0, $budget->remaining($user));

        $this->expectException(AiBudgetExceededException::class);
        $budget->ensureWithinBudget($user);
    }

    public function test_budget_usage_is_isolated_per_user(): void
    {
        config(['services.openrouter.daily_request_limit' => 5]);

        $userA = User::factory()->create(['timezone' => 'UTC']);
        $userB = User::factory()->create(['timezone' => 'UTC']);
        $budget = app(AiBudgetService::class);

        Auth::setUser($userA);
        $budget->recordUsage($userA, 50);

        Auth::setUser($userB);
        $this->assertSame(5, $budget->remaining($userB));
    }
}
