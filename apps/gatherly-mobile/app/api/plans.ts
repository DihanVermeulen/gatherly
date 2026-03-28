import apiClient from "./client";
import { TEvent } from "./events";

export const plansApi = {
  /**
   * Upgrade an event to Premium.
   * Calls PATCH /api/events/:id/upgrade and returns the updated TEvent.
   */
  upgrade(eventId: string): Promise<TEvent> {
    return apiClient
      .patch<TEvent>(`/api/events/${eventId}/upgrade`)
      .then((response) => response.data);
  },
};
