/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import {tmpdir} from 'os';
import {
  cleanup,
  generateTestFilesToForceUsingWorkers,
  writeFiles,
} from '../Utils';
import runJest from '../runJest';

const DIR = path.resolve(tmpdir(), 'fatal-worker-error');

beforeEach(() => cleanup(DIR));
afterAll(() => cleanup(DIR));

test('fails a test that terminates the worker with a fatal error', () => {
  const testFiles = {
    ...generateTestFilesToForceUsingWorkers(),
    '__tests__/fatalWorkerError.test.js': `
      test('fatal worker error', () => {
        process.exit(134);
      });
    `,
  };

  writeFiles(DIR, {
    ...testFiles,
    'package.json': '{}',
  });

  const {status, stderr} = runJest(DIR, ['--maxWorkers=2']);

  const numberOfTestsPassed = (stderr.match(/\bPASS\b/g) || []).length;

  expect(status).not.toBe(0);
  expect(numberOfTestsPassed).toBe(Object.keys(testFiles).length - 1);
  expect(stderr).toContain('FAIL __tests__/fatalWorkerError.test.js');
  expect(stderr).toContain('Call retries were exceeded');
});
