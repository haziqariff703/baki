/**
 * Data Export & Verified Account Deletion Feature Module
 *
 * Deterministic serialization (§2.1), server-side export assembly (§5.3), and
 * a staged, verified deletion request (§2.2). Persistence is delegated to the
 * consent repository; the use-cases here orchestrate reads and the deletion
 * gate.
 */
export { assembleExport } from './export';
export { requestDeletionUseCase } from './deletion';
export { serializeCsv, serializeJson } from './serialize';
export type { AssembledExport } from './serialize';
