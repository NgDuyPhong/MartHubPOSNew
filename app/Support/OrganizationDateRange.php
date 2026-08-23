<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use InvalidArgumentException;

final class OrganizationDateRange
{
    public function __construct(
        public readonly ?CarbonImmutable $fromUtc,
        public readonly ?CarbonImmutable $toExclusiveUtc,
    ) {}

    public static function fromLocalDates(?string $from, ?string $to, string $timezone): self
    {
        return new self(
            fromUtc: self::startOfLocalDay($from, $timezone),
            toExclusiveUtc: self::startOfNextLocalDay($to, $timezone),
        );
    }

    private static function startOfLocalDay(?string $date, string $timezone): ?CarbonImmutable
    {
        if ($date === null) {
            return null;
        }

        $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $date, $timezone);

        if ($parsed === false) {
            throw new InvalidArgumentException('The date range contains an invalid local date.');
        }

        return $parsed->startOfDay()->utc();
    }

    private static function startOfNextLocalDay(?string $date, string $timezone): ?CarbonImmutable
    {
        if ($date === null) {
            return null;
        }

        $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $date, $timezone);

        if ($parsed === false) {
            throw new InvalidArgumentException('The date range contains an invalid local date.');
        }

        return $parsed->addDay()->startOfDay()->utc();
    }
}
