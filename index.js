/** Copyright (c) 2017 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = robot => {
  robot.on('pull_request.opened', check);
  robot.on('pull_request.reopened', check);
  robot.on('pull_request.edited', check);
  robot.on('pull_request.synchronize', check);
  robot.on('pull_request.unlabeled', check);
  robot.on('pull_request.labeled', check);

  async function check(context) {
    const {github} = context;
    const pr = context.payload.pull_request;

    const requiredLabels = (await context.config('required-labels.yml', {
      labels: [
        'breaking',
        'feature',
        'bugfix',
        'docs',
        'discussion',
        'release',
        'prerelease',
        'greenkeeping',
      ],
    })).labels;

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

    function generateMissingLabelComment() {
      return `Please add one of the following required labels:\n- ${requiredLabels.join(
        '\n- ',
      )}`;
    }

    async function getMissingLabelComments() {
      const userId = process.env.GH_USER_ID || 42192675;
      if (userId) {
        const comments = await github.issues.getComments(context.issue());
        return comments.data
          .filter(
            c =>
              c.user.id === userId && c.body === generateMissingLabelComment(),
          )
          .map(c => c.id);
      }
      return [];
    }

    async function clearComments() {
      const commentsToDelete = await getMissingLabelComments();

      if (commentsToDelete) {
        return commentsToDelete.map(id => {
          return github.issues.deleteComment(
            context.issue({
              comment_id: id,
            }),
          );
        });
      }
    }

    const hasRequiredLabel = getRequiredLabels(pr).length > 0;
    if (hasRequiredLabel) {
      // delete existing comments, if applicable
      clearComments();

      // set status to success
      return setStatus(context, {
        state: 'success',
        description: 'At least one required semver-related label exists',
      });
    } else {
      if (!(await getMissingLabelComments()).length) {
        github.issues.createComment(
          context.issue({
            body: generateMissingLabelComment(),
          }),
        );
      }

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
