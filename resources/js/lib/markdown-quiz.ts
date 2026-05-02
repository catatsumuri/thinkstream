export type QuizOption = {
    label: string;
    text: string;
};

export type QuizContent = {
    question: string;
    correct: string;
    options: QuizOption[];
    hint?: string;
    incorrect?: string;
    correctMessage?: string;
    explanation?: string;
};

export function parseQuiz(json: string | undefined): QuizContent | null {
    try {
        if (!json) {
            return null;
        }

        const quiz = JSON.parse(json) as QuizContent;
        const normalizedCorrect = quiz.correct?.trim().toUpperCase();
        const normalizedOptions = Array.isArray(quiz.options)
            ? quiz.options
                  .filter(
                      (option): option is QuizOption =>
                          typeof option.label === 'string' &&
                          typeof option.text === 'string' &&
                          option.label.trim() !== '' &&
                          option.text.trim() !== '',
                  )
                  .map((option) => ({
                      label: option.label.trim().toUpperCase(),
                      text: option.text.trim(),
                  }))
            : [];

        if (
            !quiz.question ||
            !normalizedCorrect ||
            normalizedOptions.length < 2 ||
            !normalizedOptions.some(
                (option) => option.label === normalizedCorrect,
            )
        ) {
            return null;
        }

        return {
            ...quiz,
            question: quiz.question.trim(),
            correct: normalizedCorrect,
            options: normalizedOptions,
            hint: quiz.hint?.trim() || undefined,
            incorrect: quiz.incorrect?.trim() || undefined,
            correctMessage: quiz.correctMessage?.trim() || undefined,
            explanation: quiz.explanation?.trim() || undefined,
        };
    } catch {
        return null;
    }
}
