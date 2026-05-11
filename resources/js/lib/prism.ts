import Prism from 'prismjs';

let prismSetupPromise: Promise<typeof Prism> | null = null;

// Prevent Prism from running highlightAll() on DOMContentLoaded, which would
// mutate the DOM before React hydration and cause hydration mismatches.
Prism.manual = true;

function registerPrismGlobal(): void {
    (
        globalThis as typeof globalThis & {
            Prism?: typeof Prism;
        }
    ).Prism = Prism;
}

registerPrismGlobal();

export function ensurePrismLoaded(): Promise<typeof Prism> {
    if (prismSetupPromise) {
        return prismSetupPromise;
    }

    prismSetupPromise = (async () => {
        await import('prismjs/components/prism-bash');
        await import('prismjs/components/prism-css');
        await import('prismjs/components/prism-javascript');
        await import('prismjs/components/prism-json');
        await import('prismjs/components/prism-jsx');
        await import('prismjs/components/prism-markup-templating');
        await import('prismjs/components/prism-php');
        await import('prismjs/components/prism-python');
        await import('prismjs/components/prism-typescript');
        await import('prismjs/components/prism-tsx');

        return Prism;
    })();

    return prismSetupPromise;
}

export default Prism;
