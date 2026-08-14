<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Materials storage disk
    |--------------------------------------------------------------------------
    |
    | Separate from the app-wide FILESYSTEM_DISK default (which points at
    | DigitalOcean Spaces per "Technical direction" in the plan, but has no
    | credentials configured in dev): defaults to the local "public" disk
    | so uploads work out of the box; set MATERIALS_DISK=spaces once real
    | Spaces credentials exist.
    |
    */

    'disk' => env('MATERIALS_DISK', 'public'),

];
