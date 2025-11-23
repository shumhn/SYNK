import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
);

/**
 * Get Google Calendar authorization URL
 */
export function getGoogleCalendarAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getGoogleCalendarTokens(code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create a calendar event from a task
 */
export async function createCalendarEvent(tokens, task) {
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  if (!task.dueDate) return null; // Only create events for tasks with due dates

  const event = {
    summary: task.title,
    description: task.description || '',
    start: {
      dateTime: new Date(task.dueDate).toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
      timeZone: 'UTC',
    },
    extendedProperties: {
      private: {
        taskId: task._id.toString(),
        source: 'zalient-productive',
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });

  return response.data.id; // Return Google Calendar event ID
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(tokens, eventId, task) {
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: task.title,
    description: task.description || '',
    start: {
      dateTime: new Date(task.dueDate).toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: 'UTC',
    },
  };

  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId,
    resource: event,
  });

  return response.data;
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(tokens, eventId) {
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });
}

/**
 * Refresh access token if expired
 */
export async function refreshGoogleToken(refreshToken) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}
