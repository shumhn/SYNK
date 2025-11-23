import connectToDatabase from "@/lib/db/mongodb";
import CalendarConnection from "@/models/CalendarConnection";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, refreshGoogleToken } from "@/lib/google-calendar";

/**
 * Sync task to user's Google Calendar
 */
export async function syncTaskToCalendar(task, userId, action = "create") {
  try {
    await connectToDatabase();
    
    // Get user's calendar connection
    const connection = await CalendarConnection.findOne({
      user: userId,
      provider: "google",
      active: true,
      syncEnabled: true,
    });

    if (!connection) return; // User doesn't have calendar sync enabled

    // Refresh token if needed
    let tokens = {
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
    };

    if (connection.tokenExpiry && new Date() > connection.tokenExpiry) {
      tokens = await refreshGoogleToken(connection.refreshToken);
      await CalendarConnection.findByIdAndUpdate(connection._id, {
        accessToken: tokens.access_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      });
    }

    // Perform calendar action
    if (action === "create" && task.dueDate) {
      const eventId = await createCalendarEvent(tokens, task);
      // Store eventId in task metadata if needed
      console.log(`Created calendar event: ${eventId} for task: ${task._id}`);
    } else if (action === "update" && task.calendarEventId) {
      await updateCalendarEvent(tokens, task.calendarEventId, task);
      console.log(`Updated calendar event: ${task.calendarEventId}`);
    } else if (action === "delete" && task.calendarEventId) {
      await deleteCalendarEvent(tokens, task.calendarEventId);
      console.log(`Deleted calendar event: ${task.calendarEventId}`);
    }
  } catch (error) {
    console.error("Calendar sync error:", error);
    // Don't throw - calendar sync failure shouldn't break task operations
  }
}
