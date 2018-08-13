/** Copyright (c) 2017 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-env jest */

const {Application} = require('probot');
const app = require('../index.js');

const prOpenedNoLabelsPayload = require('./fixtures/pr-opened-no-labels-payload.json');
const prLabeledRequiredLabelsPayload = require('./fixtures/pr-labeled-required-labels-payload.1');

describe('probot-app-pr-label', () => {
  let robot;
  let github;

  beforeEach(() => {
    robot = new Application();
    robot.load(app);
    github = {
      issues: {
        createComment: jest.fn(),
      },
      repos: {
        getContent: jest
          .fn()
          .mockReturnValue(Promise.resolve({data: {content: ''}})),
        createStatus: jest.fn().mockReturnValue(Promise.resolve(true)),
      },
    };
    // Passes the mocked out GitHub API into out robot instance
    robot.auth = () => Promise.resolve(github);
  });

  it('sets status to failure for missing required labels in payload', async () => {
    await robot.receive({
      event: 'pull_request',
      payload: prOpenedNoLabelsPayload,
    });
    // Should immediately set success
    const statusCalls = github.repos.createStatus.mock.calls;
    expect(github.repos.createStatus).toHaveBeenCalled();
    expect(statusCalls.length).toBe(2);
    expect(statusCalls[0][0].state).toBe('pending');
    expect(statusCalls[1][0].state).toBe('failure');
  });

  it('set status to success if at least one required label in payload', async () => {
    await robot.receive({
      event: 'pull_request',
      payload: prLabeledRequiredLabelsPayload,
    });
    // Should immediately set success
    const statusCalls = github.repos.createStatus.mock.calls;
    expect(github.repos.createStatus).toHaveBeenCalled();
    expect(statusCalls.length).toBe(2);
    expect(statusCalls[0][0].state).toBe('pending');
    expect(statusCalls[1][0].state).toBe('success');
  });
});
