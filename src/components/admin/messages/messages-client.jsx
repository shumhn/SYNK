"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import ChannelList from "./channel-list";
import MessageThread from "./message-thread";
import NewChannelModal from "./new-channel-modal";

export default function MessagesClient() {
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [channelType, setChannelType] = useState("all"); // all, private, group
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.error) {
          setCurrentUser(data.data);
        }
      } catch (e) {
        console.error("Failed to load current user", e);
      }
    }
    loadCurrentUser();
  }, []);

  const selectedChannel = useMemo(() => {
    if (!selectedChannelId) return null;
    return channels.find((c) => c._id === selectedChannelId) || null;
  }, [channels, selectedChannelId]);

  const loadChannels = useCallback(async ({ forceSelectFirst = false } = {}) => {
    setLoadingChannels(true);
    try {
      const url = channelType === "all" 
        ? "/api/channels" 
        : `/api/channels?type=${channelType}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error) {
        const fetched = Array.isArray(data.data) ? data.data : [];
        setChannels(fetched);

        if (fetched.length === 0) {
          setSelectedChannelId(null);
        } else if (forceSelectFirst || !selectedChannelId) {
          setSelectedChannelId(fetched[0]._id);
        } else if (!fetched.some((c) => c._id === selectedChannelId)) {
          setSelectedChannelId(fetched[0]._id);
        }
      }
    } catch (e) {
      console.error("Failed to load channels:", e);
    } finally {
      setLoadingChannels(false);
    }
  }, [channelType, selectedChannelId]);

  useEffect(() => {
    loadChannels({ forceSelectFirst: true });
  }, [loadChannels]);

  useEffect(() => {
    loadChannels();
  }, [channelType, loadChannels]);

  function handleChannelCreated(newChannel) {
    setChannels((prev) => {
      const without = prev.filter((c) => c._id !== newChannel._id);
      return [newChannel, ...without];
    });
    setSelectedChannelId(newChannel._id);
    setShowNewChannelModal(false);
  }

  const handleSelectChannel = useCallback((channel) => {
    setSelectedChannelId(channel?._id || null);
  }, []);

  const handleChannelUpdated = useCallback(() => {
    loadChannels();
  }, [loadChannels]);

  return (
    <div className="flex h-full bg-neutral-950">
      {/* Sidebar */}
      <div className="w-80 border-r border-neutral-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">💬 Messages</h2>
            <button
              onClick={() => setShowNewChannelModal(true)}
              className="px-3 py-1.5 rounded bg-white text-black text-sm font-medium hover:bg-gray-200"
            >
              + New
            </button>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1">
            <button
              onClick={() => setChannelType("all")}
              className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                channelType === "all" ? "bg-white text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setChannelType("private")}
              className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                channelType === "private" ? "bg-white text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Direct
            </button>
            <button
              onClick={() => setChannelType("group")}
              className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                channelType === "group" ? "bg-white text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Groups
            </button>
          </div>
        </div>

        {/* Channel List */}
        <ChannelList
          channels={channels}
          loading={loadingChannels}
          selectedChannel={selectedChannel}
          onSelectChannel={handleSelectChannel}
          currentUserId={currentUser._id?.toString?.() || currentUser._id}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <MessageThread
            channel={selectedChannel}
            currentUser={currentUser}
            onChannelUpdated={handleChannelUpdated}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-2">Choose a channel or start a new conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* New Channel Modal */}
      {showNewChannelModal && (
        <NewChannelModal
          onClose={() => setShowNewChannelModal(false)}
          onChannelCreated={handleChannelCreated}
          currentUserId={currentUser._id?.toString?.() || currentUser._id}
        />
      )}
    </div>
  );
}
