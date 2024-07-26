import { ActionPanel, List, Action, BrowserExtension } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

interface LinkItem {
  url: string;
  name: string;
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(async () => {
    const content = await BrowserExtension.getContent();
    const tabs = await BrowserExtension.getTabs();
    const currentTab = tabs.find((tab) => tab.active);
    const currentUrl = currentTab?.url;
    // extract all links from href tags in <a> elements
    const links = extractLinks(content, currentUrl);

    return links;
  });

  console.log(data);

  return (
    <List isLoading={isLoading}>
      {data?.map((link, index) => (
        <List.Item
          key={index}
          title={link.name}
          subtitle={link.url}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={link.url} />
              <Action.CopyToClipboard content={link.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function extractLinks(content: string, baseUrl: string | undefined): LinkItem[] {
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
  const links: LinkItem[] = [];
  const seenUrls = new Set<string>();
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    let url = match[1];

    if (!isAbsoluteUrl(url)) {
      if (baseUrl === undefined) {
        continue; // Skip relative URLs when baseUrl is undefined
      }
      url = reconstructUrl(url, baseUrl);
    }

    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      const name = match[2].replace(/<[^>]*>/g, "").trim() || url;
      links.push({ url, name });
    }
  }

  return links;
}

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//");
}

function reconstructUrl(url: string, baseUrl: string): string {
  const parsedBaseUrl = new URL(baseUrl);

  if (url.startsWith("/")) {
    return `${parsedBaseUrl.origin}${url}`;
  }

  const basePath = parsedBaseUrl.pathname.split("/").slice(0, -1).join("/");
  return `${parsedBaseUrl.origin}${basePath}/${url}`;
}
