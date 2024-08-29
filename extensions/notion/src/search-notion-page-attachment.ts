import { withAccessToken } from "@raycast/utils";
import { NotionToMarkdown } from "notion-to-md";

import { pageMapper } from "./utils/notion/global";
import { getNotionClient, notionService } from "./utils/notion/oauth";

const searchNotionPage: Attachments.SearchNotionPageAttachment = async (input: string) => {
  const notion = getNotionClient();
  const database = await notion.search({
    sort: {
      direction: "descending",
      timestamp: "last_edited_time",
    },
    page_size: 25,
    query: input,
  });

  const pages = database.results.map(pageMapper);

  return pages.map(({ id, title, ...rest }) => {
    return {
      id,
      title: title ?? "Untitled",
      content: async () => {
        const { results } = await notion.blocks.children.list({
          block_id: id,
        });

        const n2m = new NotionToMarkdown({ notionClient: notion });

        console.log("results");
        const content =
          results.length === 0 ? "*Page is empty*" : n2m.toMarkdownString(await n2m.blocksToMarkdown(results)).parent;

        // Todo: Add comments
        // const comments = await notion.comments.list({
        //   block_id: id,
        // });

        return JSON.stringify({ ...rest, content }, null, "  ");
      },
    };
  });
};

export default withAccessToken(notionService)(searchNotionPage);
