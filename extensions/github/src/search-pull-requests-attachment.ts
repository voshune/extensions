import { getGitHubClient } from "./api/githubClient";
import { PullRequestExtendedDetailsFragment, PullRequestFieldsFragment } from "./generated/graphql";
import { withGitHubClient } from "./helpers/withGithubClient";

const searchPullRequests: Attachments.SearchPullRequestsAttachment = async (input: string) => {
  const { github, octokit } = getGitHubClient();

  const results = await github.fastSearchPullRequests({
    query: `${input || "is:pr author:@me archived:false is:open"}`,
    numberOfItems: 20,
  });

  const prs = results.search.edges?.map((edge) => edge?.node as PullRequestFieldsFragment) ?? [];

  // filter out all empty PRs
  const filteredPrs = prs.filter((pr) => pr.id);

  return filteredPrs.map(({ id, title, number }) => {
    return {
      id: id,
      title: `${title} (#${number})`,
      content: async () => {
        const detail = await github.pullRequestExtendedDetails({ nodeId: id });
        const pr = detail.node as PullRequestExtendedDetailsFragment;
        const files = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/files", {
          owner: pr.repository.owner.login,
          repo: pr.repository.name,
          pull_number: pr.number,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });
        return JSON.stringify({ ...pr, files: files.data }, null, 2);
      },
    };
  });
};

export default withGitHubClient(searchPullRequests);
