/** Copyright (c) 2017 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const requiredLabels = [
  'breaking',
  'feature',
  'bugfix',
  'docs',
  'discussion',
  'release',
  'prerelease',
  'greenkeeping',
];

module.exports = robot => {
  robot.on('pull_request.opened', check);
  robot.on('pull_request.reopened', check);
  robot.on('pull_request.edited', check);
  robot.on('pull_request.synchronize', check);
  robot.on('pull_request.unlabeled', check);
  robot.on('pull_request.labeled', check);

  async function check(context) {
    const pr = context.payload.pull_request;

    // set status to pending while checks happen
    setStatus(context, {
      state: 'pending',
      description:
        'Checking whether at least one required semver-related label exists',
    });

    function getRequiredLabels(pr) {
      const labels = pr.labels;
      const filteredLabels = labels.filter(l =>
        requiredLabels.includes(l.name),
      );
      return filteredLabels;
    }

    const hasRequiredLabel = getRequiredLabels(pr).length > 0;
    if (hasRequiredLabel) {
      // set status to success
      return setStatus(context, {
        state: 'success',
        description: 'At least one required semver-related label exists',
      });
    } else {
      // failure - missing label
      return setStatus(context, {
        state: 'failure',
        description: `Missing a mandatory semver-related label (e.g. 'breaking' or 'feature')`,
      });
    }
  }
};

async function setStatus(context, {state, description}) {
  const {github} = context;
  return github.repos.createStatus(
    context.issue({
      state,
      description,
      sha: context.payload.pull_request.head.sha,
      context: 'probot/pr-label',
    }),
  );
}
