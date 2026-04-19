<?php

namespace App\Support;

class ReservedContentPath
{
    public const ROOT_SEGMENTS = [
        'admin',
        'api',
        'images',
        'login',
        'register',
    ];

    /**
     * @return array<int, string>
     */
    public static function rootSegments(): array
    {
        /** @var array<int, string> $segments */
        $segments = config('content.reserved_root_segments', self::ROOT_SEGMENTS);

        return $segments;
    }

    public static function wildcardConstraint(): string
    {
        $segments = implode('|', array_map(
            static fn (string $segment): string => preg_quote($segment, '/'),
            self::rootSegments(),
        ));

        return "^(?!(?:{$segments})(?:/|$)).+";
    }

    public static function startsWithReservedSegment(string $path): bool
    {
        $normalizedPath = trim($path, '/');

        if ($normalizedPath === '') {
            return false;
        }

        $rootSegment = explode('/', $normalizedPath)[0];

        return in_array($rootSegment, self::rootSegments(), true);
    }
}
