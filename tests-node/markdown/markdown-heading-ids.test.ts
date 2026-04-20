import assert from 'node:assert/strict';
import test from 'node:test';
import { createHeadingIdDispenser } from '../../resources/js/lib/markdown-heading-ids.ts';

test('heading id dispenser reuses the same id for the same heading instance', () => {
    const dispenseHeadingId = createHeadingIdDispenser();
    const firstHeading = {};
    const secondHeading = {};

    assert.equal(
        dispenseHeadingId('post-installation', firstHeading),
        'post-installation',
    );
    assert.equal(
        dispenseHeadingId('post-installation', firstHeading),
        'post-installation',
    );
    assert.equal(
        dispenseHeadingId('post-installation', secondHeading),
        'post-installation-2',
    );
});
