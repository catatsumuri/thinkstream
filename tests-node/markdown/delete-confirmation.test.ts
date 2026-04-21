import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesDeleteConfirmation } from '../../resources/js/lib/delete-confirmation.ts';

test('matchesDeleteConfirmation requires the exact namespace name', () => {
    assert.equal(matchesDeleteConfirmation('Guides', 'Guides'), true);
    assert.equal(matchesDeleteConfirmation('guides', 'Guides'), false);
    assert.equal(matchesDeleteConfirmation('Guides ', 'Guides'), true);
    assert.equal(matchesDeleteConfirmation(' Guides', 'Guides'), true);
});
