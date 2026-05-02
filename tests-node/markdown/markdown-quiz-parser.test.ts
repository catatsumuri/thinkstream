import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuiz } from '../../resources/js/lib/markdown-quiz.ts';

test('parseQuiz rejects quizzes whose correct answer is missing from the options', () => {
    assert.equal(
        parseQuiz(
            JSON.stringify({
                question: 'Example question',
                correct: 'Z',
                options: [
                    { label: 'A', text: 'One' },
                    { label: 'B', text: 'Two' },
                ],
            }),
        ),
        null,
    );
});

test('parseQuiz normalizes valid quiz payloads', () => {
    const quiz = parseQuiz(
        JSON.stringify({
            question: '  Example question  ',
            correct: ' b ',
            options: [
                { label: ' a ', text: ' First answer ' },
                { label: ' b ', text: ' Second answer ' },
            ],
            incorrect: '  Not quite  ',
        }),
    );

    assert.deepEqual(quiz, {
        question: 'Example question',
        correct: 'B',
        options: [
            { label: 'A', text: 'First answer' },
            { label: 'B', text: 'Second answer' },
        ],
        incorrect: 'Not quite',
        hint: undefined,
        correctMessage: undefined,
        explanation: undefined,
    });
});
