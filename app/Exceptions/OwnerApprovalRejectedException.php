<?php

namespace App\Exceptions;

use Illuminate\Validation\ValidationException;
use RuntimeException;

class OwnerApprovalRejectedException extends RuntimeException
{
    public function __construct(
        public readonly ValidationException $validation,
        public readonly int $requestedBy,
        public readonly string $action,
        public readonly string $source,
    ) {
        parent::__construct($validation->getMessage(), 0, $validation);
    }
}
