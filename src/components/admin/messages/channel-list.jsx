"use client";

import { useState } from "react";

export default function ChannelList({ channels = [], loading = false, selectedChannel, onSelectChannel, currentUserId }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChannels = channels.filter(channel => {
    if (!searchTerm) return true;
    
    if (channel.type === "private") {
      // For private channels, search by other member's name
      const otherMembers = (channel.members || []).filter(m => (m?._id || m)?.toString() !== currentUserId);
      return otherMembers.some(m => 
        (m.username || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      // For group channels, search by name
      return channel.name?.toLowerCase().includes(searchTerm.toLowerCase());
    }
  });

  function getChannelDisplayName(channel) {
    if (channel.type === "private") {
      // Show other member's name
      const otherMembers = (channel.members || []).filter(m => (m?._id || m)?.toString() !== currentUserId);
      return otherMembers.map(m => m.username || "Unknown").join(", ") || "Private Chat";
    }
    return channel.name || "Unnamed Group";
  }

  function getChannelAvatar(channel) {
    if (channel.type === "private") {
      const otherMembers = (channel.members || []).filter(m => (m?._id || m)?.toString() !== currentUserId);
      const member = otherMembers[0];
      if (member?.image) {
        return <img src={member.image} alt={member.username} className="w-8 h-8 rounded-full" />;
      }
      return (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-medium text-white">
          {member?.username?.[0]?.toUpperCase() || "?"}
        </div>
      );
    }
    
    // Group channel avatar
    return (
      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-xs font-medium text-white">
        {channel.members?.length || 0}
      </div>
    );
  }

  function getUnreadBadge(channel) {
    const unreadData = channel.unreadCount;
    let unread = 0;
    if (unreadData) {
      if (typeof unreadData.get === "function") {
        unread = unreadData.get(currentUserId) || 0;
      } else if (typeof unreadData === "object") {
        unread = unreadData[currentUserId] || 0;
      }
    }
    if (unread === 0) return null;
    
    return (
      <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
        {unread > 99 ? "99+" : unread}
      </span>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-neutral-800">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading conversations…</div>
        ) : filteredChannels.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <div className="text-2xl mb-2">💬</div>
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          filteredChannels.map(channel => (
            <div
              key={channel._id}
              onClick={() => onSelectChannel(channel)}
              className={`p-3 border-b border-neutral-800 cursor-pointer hover:bg-neutral-900 transition-colors ${
                selectedChannel?._id === channel._id ? "bg-neutral-800" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                {getChannelAvatar(channel)}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-white truncate text-sm">
                      {getChannelDisplayName(channel)}
                    </h3>
                    {channel.lastMessage?.createdAt && (
                      <span className="text-xs text-gray-500">
                        {new Date(channel.lastMessage.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Last Message Preview */}
                  {channel.lastMessage?.content ? (
                    <p className="text-xs text-gray-400 truncate">
                      <span className="font-medium text-gray-300">
                        {channel.lastMessage.author?.username || "Someone"}
                      </span>
                      : {channel.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 italic">
                      {channel.type === "private" ? "Start a conversation..." : "No messages yet"}
                    </p>
                  )}

                  {/* Members for group channels */}
                  {channel.type === "group" && channel.members && (
                    <p className="text-xs text-gray-500 mt-1">
                      {channel.members.length} members
                    </p>
                  )}
                </div>

                {/* Unread Badge */}
                {getUnreadBadge(channel)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
