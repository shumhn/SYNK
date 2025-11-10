import MessagesClient from "@/components/admin/messages/messages-client";

export default async function MessagesPage() {
  // Authentication is handled by admin layout
  return (
    <div className="h-[calc(100vh-4rem)]">
      <MessagesClient />
    </div>
  );
}
