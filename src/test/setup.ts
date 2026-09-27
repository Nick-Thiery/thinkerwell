// Vitest setup, shared by every unit and component test.
// - jest-dom adds matchers such as toBeInTheDocument().
// - fake-indexeddb gives jsdom a working IndexedDB, so storage code runs in tests.
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { configure } from '@testing-library/react';

// findBy* and waitFor wait up to 5 s (the default is 1 s). The every-lesson
// loops wait for 24 IndexedDB-backed renders in a row, and under load (a
// type check or other test files running alongside) 1 s isn't always
// enough; a longer ceiling costs nothing when things are quick.
configure({ asyncUtilTimeout: 5_000 });
