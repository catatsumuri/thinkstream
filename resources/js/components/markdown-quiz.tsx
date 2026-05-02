import { CircleCheck, CircleX } from 'lucide-react';
import { useState } from 'react';
import { parseQuiz } from '@/lib/markdown-quiz';
import { cn } from '@/lib/utils';

interface MarkdownQuizProps {
    'data-quiz'?: string;
}

export function MarkdownQuiz({ 'data-quiz': json }: MarkdownQuizProps) {
    const quiz = parseQuiz(json);
    const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
    const [submittedLabel, setSubmittedLabel] = useState<string | null>(null);

    if (quiz === null) {
        return null;
    }

    const selectedOption = quiz.options.find(
        (option) => option.label === selectedLabel,
    );
    const submittedOption = quiz.options.find(
        (option) => option.label === submittedLabel,
    );
    const isSubmitted = submittedLabel !== null;
    const isCorrect = submittedLabel === quiz.correct;
    const statusLabel = isCorrect
        ? (quiz.correctMessage ?? 'Correct')
        : (quiz.incorrect ?? 'Not Quite');

    return (
        <div
            className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-background"
            data-test="markdown-quiz"
        >
            <div className="border-b border-border/70 px-6 py-6 text-center">
                <h3 className="text-xl font-semibold text-foreground">
                    {quiz.question}
                </h3>
            </div>

            {isSubmitted && submittedOption ? (
                <div className="px-6 py-8">
                    <div className="rounded-xl border border-border/70 px-6 py-8 text-center">
                        <div className="mx-auto flex w-fit items-center justify-center rounded-full bg-muted px-4 py-2">
                            <span className="text-sm font-semibold text-muted-foreground">
                                {submittedOption.label}
                            </span>
                        </div>
                        <p className="mt-5 text-lg font-semibold text-foreground">
                            {submittedOption.text}
                        </p>
                        <div
                            className={cn(
                                'mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
                                isCorrect
                                    ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                            )}
                        >
                            {isCorrect ? (
                                <CircleCheck className="h-4 w-4" />
                            ) : (
                                <CircleX className="h-4 w-4" />
                            )}
                            {statusLabel}
                        </div>
                        {!isCorrect && quiz.hint ? (
                            <p className="mt-6 text-base text-muted-foreground">
                                Hint: {quiz.hint}
                            </p>
                        ) : null}
                        {isCorrect && quiz.explanation ? (
                            <p className="mt-6 text-base text-muted-foreground">
                                {quiz.explanation}
                            </p>
                        ) : null}
                    </div>
                    <div className="mt-6 flex justify-center">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedLabel(null);
                                setSubmittedLabel(null);
                            }}
                            className="inline-flex items-center rounded-lg border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            ) : (
                <div className="px-6 py-5">
                    <div className="overflow-hidden rounded-xl border border-border/70">
                        {quiz.options.map((option) => {
                            const isSelected = selectedLabel === option.label;

                            return (
                                <button
                                    key={option.label}
                                    type="button"
                                    onClick={() =>
                                        setSelectedLabel(option.label)
                                    }
                                    className={cn(
                                        'flex w-full items-start gap-4 px-4 py-5 text-left transition-colors',
                                        'hover:bg-muted/40 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/70',
                                        isSelected && 'bg-muted/50',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                                            isSelected
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-primary',
                                        )}
                                    >
                                        {option.label}
                                    </span>
                                    <span className="text-base leading-7 text-foreground">
                                        {option.text}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                if (selectedOption) {
                                    setSubmittedLabel(selectedOption.label);
                                }
                            }}
                            disabled={!selectedOption}
                            className="rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Check Answer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
