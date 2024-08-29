import { getLinearClient, linear } from "./api/linearClient";
import { ProjectUpdate, User } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";
import { startOfMonth, startOfQuarter, formatISO, startOfWeek } from "date-fns";

type ProjectUpdateResult = Pick<ProjectUpdate, "id" | "body" | "url" | "health" | "createdAt"> & {
  user: Pick<User, "id" | "displayName" | "avatarUrl" | "email">;
} & {
  project: { id: string; name: string; url: string };
};

const getProjectUpdatesSince = async (date: Date) => {
  const { graphQLClient } = getLinearClient();
  const formattedDate = formatISO(date);

  const query = `
    query {
      projectUpdates(
        filter: {
          createdAt: { gte: "${formattedDate}" }
        }
      ) {
        nodes {
          id
          body
          url
          health
          createdAt
          user {
            id
            displayName
            avatarUrl
            email
          }
          project {
            id
            name
            url
          }
        }
      }
    }
  `;

  const { data } = await graphQLClient.rawRequest<
    { projectUpdates: { nodes: ProjectUpdateResult[] } },
    Record<string, unknown>
  >(query);

  const projectUpdates = data?.projectUpdates.nodes ?? [];

  return JSON.stringify(
    projectUpdates.map((update) => {
      return {
        id: update.id,
        user: update.user.displayName,
        url: update.url,
        health: update.health,
        body: update.body,
        createdAt: update.createdAt,
        project: update.project.name,
      };
    }),
    null,
    "",
  );
};

const fetchProjectUpdates: Attachments.ProjectUpdates = async () => {
  const now = new Date();

  return [
    {
      id: "this-week",
      title: "This Week",
      content: () => getProjectUpdatesSince(startOfWeek(now)),
    },
    {
      id: "this-month",
      title: "This Month",
      content: () => getProjectUpdatesSince(startOfMonth(now)),
    },
    {
      id: "this-quarter",
      title: "This Quarter",
      content: () => getProjectUpdatesSince(startOfQuarter(now)),
    },
  ];
};

export default withAccessToken(linear)(fetchProjectUpdates);
