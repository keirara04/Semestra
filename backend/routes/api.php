<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Skeleton only — no domain routes yet. Everything mounted under /api,
// served from api.<domain> per the hosting/subdomain decision in the plan.

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
