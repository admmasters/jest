/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {tmpdir} from 'os';
import {resolve} from 'path';
import findProcess from 'find-process';

import {
  cleanup,
  generateTestFilesToForceUsingWorkers,
  writeFiles,
} from '../Utils';
import runJest from '../runJest';

const DIR = resolve(tmpdir(), 'worker-force-exit');

beforeEach(() => cleanup(DIR));
afterEach(() => cleanup(DIR));
const testFiles = {
  ...generateTestFilesToForceUsingWorkers(),
  'package.json': `{
      "testEnvironment": "node"
  }`,
};

const verifyNumPassed = stderr => {
  const numberOfTestsPassed = (stderr.match(/\bPASS\b/g) || []).length;
  // assuming -1 because of package.json, but +1 because of the individual test file
  expect(numberOfTestsPassed).toBe(Object.keys(testFiles).length);
};

test('prints a warning if a worker is force exited', () => {
  writeFiles(DIR, {
    ...testFiles,
    '__tests__/simple.test.js': `
      test('t', () => {
        require('http').createServer().listen(0);
      });
    `,
  });
  const {status, stderr, stdout} = runJest(DIR, ['--maxWorkers=2']);

  expect(status).toBe(0);
  verifyNumPassed(stderr);
  expect(stdout).toContain('A worker process has failed to exit gracefully');
});

test('force exits a worker that fails to exit gracefully', async () => {
  writeFiles(DIR, {
    ...testFiles,
    '__tests__/timeoutKilled.test.js': `
      test('t', () => {
        require('http').createServer().listen(0);
        console.error('pid: ' + process.pid);
      });
    `,
  });
  const {status, stderr} = runJest(DIR, ['--maxWorkers=2']);

  expect(status).toBe(0);
  verifyNumPassed(stderr);

  const [pid] = /pid: \d+/.exec(stderr);
  expect(await findProcess('pid', pid)).toHaveLength(0);
});
