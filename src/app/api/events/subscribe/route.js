import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/jwt";

// Track active SSE connections
const connections = new Map();

/**
 * GET /api/events/subscribe
 * Server-Sent Events (SSE) endpoint for real-time updates
 * Client connects once and receives push notifications
 */
export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authResult.user.id;

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", userId })}\n\n`));

        // Store connection
        connections.set(userId, { controller, encoder });

        // Keep-alive ping every 30 seconds
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: keep-alive\n\n`));
          } catch (error) {
            clearInterval(keepAlive);
          }
        }, 30000);

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          clearInterval(keepAlive);
          connections.delete(userId);
          try {
            controller.close();
          } catch (e) {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("SSE connection error:", error);
    return NextResponse.json({ error: "Failed to establish SSE connection" }, { status: 500 });
  }
}

/**
 * Send event to specific user
 * @param {string} userId - User ID to send event to
 * @param {object} event - Event data
 */
export function sendEventToUser(userId, event) {
  const connection = connections.get(userId);
  if (connection) {
    try {
      const data = JSON.stringify(event);
      connection.controller.enqueue(connection.encoder.encode(`data: ${data}\n\n`));
    } catch (error) {
      console.error("Error sending event to user:", error);
      connections.delete(userId);
    }
  }
}

/**
 * Send event to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {object} event - Event data
 */
export function sendEventToUsers(userIds, event) {
  userIds.forEach((userId) => sendEventToUser(userId, event));
}

/**
 * Broadcast event to all connected users
 * @param {object} event - Event data
 */
export function broadcastEvent(event) {
  connections.forEach((connection, userId) => {
    try {
      const data = JSON.stringify(event);
      connection.controller.enqueue(connection.encoder.encode(`data: ${data}\n\n`));
    } catch (error) {
      console.error("Error broadcasting to user:", userId, error);
      connections.delete(userId);
    }
  });
}
