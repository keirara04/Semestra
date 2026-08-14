<?php

namespace App\Services\Notestra;

use Exception;

/**
 * Thrown when a batch upsert carries a client-known `updated_at` older than
 * the server's current row — see mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Section
 * 9 ("Conflict handling / versioning"). Mapped to HTTP 409 by the controller.
 */
class AnnotationConflictException extends Exception {}
