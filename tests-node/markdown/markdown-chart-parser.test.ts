import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getChartDomain,
    parseChart,
} from '../../resources/js/lib/markdown-chart.ts';

test('parseChart rejects charts without usable data points', () => {
    assert.equal(
        parseChart(
            JSON.stringify({
                type: 'bar',
                data: [{ label: 'Juniper', value: 'not-a-number' }],
            }),
        ),
        null,
    );
});

test('parseChart normalizes valid chart payloads', () => {
    const chart = parseChart(
        JSON.stringify({
            type: 'radar',
            title: '  Flavor Profile  ',
            min: ' 1 ',
            max: 10,
            data: [
                { label: ' Juniper ', value: '9' },
                { label: ' Citrus ', value: 4 },
            ],
        }),
    );

    assert.deepEqual(chart, {
        type: 'radar',
        title: 'Flavor Profile',
        min: 1,
        max: 10,
        data: [
            { label: 'Juniper', value: 9 },
            { label: 'Citrus', value: 4 },
        ],
    });
});

test('parseChart rejects charts whose minimum exceeds the maximum', () => {
    assert.equal(
        parseChart(
            JSON.stringify({
                type: 'bar',
                min: 10,
                max: 2,
                data: [{ label: 'Juniper', value: 9 }],
            }),
        ),
        null,
    );
});

test('getChartDomain expands collapsed ranges', () => {
    assert.deepEqual(
        getChartDomain({
            type: 'bar',
            min: 0,
            data: [{ label: 'Juniper', value: 0 }],
        }),
        [0, 1],
    );
});
