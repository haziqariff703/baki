/**
 * Ambient type declaration for pdf.js's worker build.
 *
 * pdfjs-dist ships `pdf.worker.mjs` without bundled TypeScript declarations.
 * We only ever import it to read its `WorkerMessageHandler` export onto the
 * main thread; the structural type is declared in `pdfParser.ts`.
 */
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs';
