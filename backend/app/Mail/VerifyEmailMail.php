<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class VerifyEmailMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $url) {}

    public function build(): self
    {
        return $this->subject('Semestra: Confirm your email address')
            ->text('mail.verify-email', ['url' => $this->url]);
    }
}
