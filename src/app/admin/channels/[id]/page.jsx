import ChannelChat from "@/components/admin/channels/channel-chat";
import { serializeForClient } from "@/lib/utils/serialize";
import connectToDatabase from "@/lib/db/mongodb";
import Channel from "@/models/Channel";

export const dynamic = "force-dynamic";

async function getChannel(id) {
  await connectToDatabase();
  const ch = await Channel.findById(id).lean();
  return ch ? serializeForClient(ch) : null;
}

export default async function ChannelChatPage({ params }) {
  const { id } = await params;
  const channel = await getChannel(id);

  if (!channel) {
    return (
      <div className="p-6">
        <div className="text-red-400">Channel not found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">#{channel.name}</h1>
          {channel.description ? (
            <p className="text-sm text-gray-400 mt-1">{channel.description}</p>
          ) : null}
        </div>
      </div>

      <div className="h-[70vh] border border-neutral-800 rounded">
        <ProjectChat channelId={channel._id} />
      </div>
    </div>
  );
}
