<?php

test('top page loads', function () {
    $page = visit('/');

    $page->assertSee('ThinkStream');
});
