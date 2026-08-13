<?php

return [
    /*
    |--------------------------------------------------------------------------
    | One-shot legacy product import feature flag
    |--------------------------------------------------------------------------
    |
    | Set LEGACY_PRODUCT_IMPORT_ENABLED=false after the catalog cutover. The
    | routes and navigation disappear, while the product data remains intact.
    |
    */
    'enabled' => (bool) env('LEGACY_PRODUCT_IMPORT_ENABLED', true),
];
