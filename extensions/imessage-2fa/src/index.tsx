import { List, ActionPanel, Action, Icon } from "@raycast/api";
import useInterval from "@use-it/interval";
import { useTwoFactorCodes } from "./messages";
import { Message } from "./types";
import { extractCode } from "./utils";

const POLLING_INTERVAL = 1_000;

export default function Command() {
  const { isLoading, data, permissionView, revalidate } = useTwoFactorCodes();

  useInterval(revalidate, POLLING_INTERVAL);

  if (permissionView) {
    return permissionView;
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data?.length ? (
        data.map((message) => {
          const code = extractCode(message.text);
          if (!code) {
            return null;
          }

          return (
            <List.Item
              key={message.guid}
              icon={Icon.Message}
              title={code}
              keywords={[message.sender, message.text]}
              detail={<Detail message={message} code={code} />}
              actions={<Actions message={message} code={code} />}
            />
          );
        })
      ) : (
        <List.EmptyView title="No codes found" description="Keeps refreshing every second" />
      )}
    </List>
  );
}

function Detail(props: { message: Message; code: string }) {
  return (
    <List.Item.Detail
      markdown={props.message.text}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Code" text={props.code} />
          <List.Item.Detail.Metadata.Label title="From" text={props.message.sender} />
          <List.Item.Detail.Metadata.Label title="Date" text={new Date(props.message.message_date).toLocaleString()} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function Actions(props: { message: Message; code: string }) {
  return (
    <ActionPanel title="Action">
      <ActionPanel.Section>
        <Action.Paste content={props.code} title="Paste Code" />
        <Action.CopyToClipboard content={props.code} title="Copy Code" />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          content={props.message.text}
          title="Copy Message"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard
          content={props.code + "\t" + props.message.text}
          title="Copy Code and Message"
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
