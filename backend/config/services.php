<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // See "AI operations (v1 constraints)" in mdfile/semester-command-center.md
    // and mdfile/AI.md — key stays server-side only, never shipped to the
    // Next.js frontend. Two-tier model selection, not one model for
    // everything: "default" is cheap/fast for light tasks (explanations,
    // request parsing, rewriting), "important" is the stronger model for
    // tasks worth the extra cost (syllabus extraction, ambiguous
    // multilingual text). Callers pick a tier, never a raw model string.
    'openrouter' => [
        'key' => env('OPENROUTER_API_KEY'),
        'model_default' => env('OPENROUTER_MODEL_DEFAULT', 'google/gemini-2.5-flash-lite'),
        'model_important' => env('OPENROUTER_MODEL_IMPORTANT', 'google/gemini-2.5-flash'),
        'daily_request_limit' => env('AI_DAILY_REQUEST_LIMIT', 20),
    ],

];
