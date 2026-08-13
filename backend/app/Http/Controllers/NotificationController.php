<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Notification::class);

        return response()->json(
            Notification::orderByDesc('created_at')->limit(50)->get()
        );
    }

    public function markRead(Notification $notification): JsonResponse
    {
        $this->authorize('update', $notification);

        $notification->update(['read_at' => $notification->read_at ?? now()]);

        return response()->json($notification);
    }
}
