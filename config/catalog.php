<?php

return [
    'images' => [
        'disk' => env('CATALOG_IMAGE_DISK', 'public'),
        'directory' => 'products',
        'max_width' => 640,
        'max_height' => 640,
        'max_source_width' => 6000,
        'max_source_height' => 6000,
        'max_bytes' => 4 * 1024 * 1024,
        'webp_quality' => 82,
        'external_hosts' => [],
        'orphan_grace_days' => 7,
    ],
];
