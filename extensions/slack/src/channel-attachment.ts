import { getSlackWebClient } from "./shared/client/WebClient";
import { withSlackClient } from "./shared/withSlackClient";

const fetchChannelMessages: Attachments.ChannelAttachment = async () => {
  const slackWebClient = getSlackWebClient();
  const channels = await slackWebClient.conversations.list({
    exclude_archived: true,
    types: "public_channel,private_channel",
    limit: 1000,
  });

  return (
    channels.channels?.reduce((prev, channel) => {
      if (channel.id && channel.name) {
        const { id, name } = channel;
        prev.push({
          id,
          title: name,
          content: async () => {
            const messages = await slackWebClient.conversations.history({
              channel: id,
              limit: 10,
            });

            return JSON.stringify(messages.messages, null, "  ");
          },
        });
      }
      return prev;
    }, [] as { id: string; title: string; content: () => Promise<string> }[]) ?? []
  );
};

export default withSlackClient(fetchChannelMessages);
