<?php

namespace App\Mail;

use App\Models\Notification;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Notification $notification) {}

    public function build(): self
    {
        return $this->subject('Semestra: '.$this->subjectLine())
            ->text('mail.notification', ['body' => $this->notification->message]);
    }

    private function subjectLine(): string
    {
        return match ($this->notification->type) {
            'deficit_today' => 'Assessment at risk',
            'topic_unreviewed' => 'Topic overdue for review',
            'tomorrow_overloaded' => 'Tomorrow is overloaded',
            'exam_weak_topics' => 'Exam readiness check',
            default => 'Notification',
        };
    }
}
