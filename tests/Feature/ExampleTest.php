<?php

it('renders the public welcome page', function () {
    $this->get('/')->assertInertia(fn ($page) => $page->component('welcome'));
});
