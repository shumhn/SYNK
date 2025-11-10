import { requireAuth } from "@/lib/auth/guard";
import MessagesClient from "@/components/admin/messages/messages-client";

export default async function MessagesPage() {
  const auth = await requireAuth();
  
  return (
    <div className="h-[calc(100vh-4rem)]">
      <MessagesClient currentUser={auth.user} />
    </div>
  );
}
