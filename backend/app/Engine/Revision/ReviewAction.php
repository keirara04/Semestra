<?php

namespace App\Engine\Revision;

final class ReviewAction
{
    /**
     * @param  string  $action  "none"|"generate"|"already_pending"|"capped"
     */
    public function __construct(
        public readonly int $topicId,
        public readonly string $action,
        public readonly ?string $dueDate,
        public readonly bool $decayConfidence,
        public readonly ?string $newConfidence,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'topic_id' => $this->topicId,
            'action' => $this->action,
            'due_date' => $this->dueDate,
            'decay_confidence' => $this->decayConfidence,
            'new_confidence' => $this->newConfidence,
        ];
    }
}
