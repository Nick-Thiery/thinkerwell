// Vitest setup, shared by every unit and component test.
// - jest-dom adds matchers such as toBeInTheDocument().
// - fake-indexeddb gives jsdom a working IndexedDB, so storage code runs in tests.
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
