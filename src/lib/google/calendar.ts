/**
 * calendar.ts — Server-side Google Calendar API integration for creating events.
 */

import { getValidGoogleAccessToken } from "./tokens";

export interface CreateCalendarEventParams {
  userId: string;
  actionId: string;
  title: string;
  description?: string | null;
  start?: string | null;
  end?: string | null;
  timezone?: string | null;
  attendees?: string[] | null;
}

export interface CreateCalendarEventResult {
  eventId: string;
  htmlLink?: string;
}

/**
 * Creates a Google Calendar event on the user's primary calendar.
 */
export async function createCalendarEvent({
  userId,
  actionId,
  title,
  description,
  start,
  end,
  timezone = "UTC",
  attendees,
}: CreateCalendarEventParams): Promise<CreateCalendarEventResult> {
  if (!userId || !title?.trim()) {
    throw new Error("[Calendar Event] Invalid parameters: userId and title are required.");
  }

  // 1. Retrieve valid Google Access Token
  const accessToken = await getValidGoogleAccessToken(userId);

  // 2. Validate and compute start/end ISO timestamps
  let startIso: string;
  let endIso: string;

  const now = new Date();

  if (start && !isNaN(Date.parse(start))) {
    startIso = new Date(start).toISOString();
  } else {
    // Default to tomorrow at 10:00 AM UTC
    const tomorrow10am = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0);
    startIso = tomorrow10am.toISOString();
  }

  if (end && !isNaN(Date.parse(end))) {
    endIso = new Date(end).toISOString();
  } else {
    // Default to 1 hour after start
    const startDateObj = new Date(startIso);
    endIso = new Date(startDateObj.getTime() + 60 * 60 * 1000).toISOString();
  }

  // 3. Construct Google Calendar API Event Payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventBody: Record<string, any> = {
    summary: title.trim(),
    description: description || undefined,
    start: {
      dateTime: startIso,
      timeZone: timezone || "UTC",
    },
    end: {
      dateTime: endIso,
      timeZone: timezone || "UTC",
    },
  };

  if (attendees && Array.isArray(attendees) && attendees.length > 0) {
    eventBody.attendees = attendees
      .filter((e) => typeof e === "string" && e.includes("@"))
      .map((email) => ({ email: email.trim() }));
  }

  // 4. Dispatch via Google Calendar API
  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Calendar Event] Google Calendar API error:", errorText);
    throw new Error(`Google Calendar API error (${response.status}): ${errorText}`);
  }

  const responseData = await response.json();
  const eventId: string = responseData.id;
  const htmlLink: string | undefined = responseData.htmlLink;

  return {
    eventId,
    htmlLink,
  };
}
