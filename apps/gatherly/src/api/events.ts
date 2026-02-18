import apiClient from "./client";

export type WishlistItem = {
  id: number;
  eventId: number;
  participantId: number;
  participantName?: string;
  itemName: string;
  description?: string;
  imageUrl?: string;
  productUrl?: string;
  priority: "low" | "medium" | "high";
  claimedBy?: number;
  claimedByName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Event = {
  id: string;
  name: string;
  people: string[];
  couples: string[][];
  assignments: Record<string, string[]> | null;
  coupleCrossing: boolean;
  gifts: Record<string, any>;
  date: string;
  participants: string[];
  participantDetails?: Array<{ id: number; name: string }>;
  wishlists?: WishlistItem[];
  hash?: string;
};

export const eventsApi = {
  // Get all events
  getAll: async (): Promise<Event[]> => {
    const response = await apiClient.get("/api/events");
    return response.data;
  },

  // Get single event
  getById: async (id: string): Promise<Event> => {
    const response = await apiClient.get(`/api/events/${id}`);
    return response.data;
  },

  // Create event
  create: async (name: string, coupleCrossing = false): Promise<Event> => {
    const response = await apiClient.post("/api/events", {
      name,
      coupleCrossing,
    });
    return response.data;
  },

  // Update event
  update: async (id: string, event: Partial<Event>): Promise<Event> => {
    const response = await apiClient.put(`/api/events/${id}`, event);
    return response.data;
  },

  // Delete event
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/events/${id}`);
  },

  // Add participant
  addParticipant: async (eventId: string, name: string): Promise<void> => {
    await apiClient.post(`/api/events/${eventId}/participants`, { name });
  },

  // Remove participant
  removeParticipant: async (eventId: string, name: string): Promise<void> => {
    await apiClient.delete(
      `/api/events/${eventId}/participants/${encodeURIComponent(name)}`,
    );
  },

  // Add couple
  addCouple: async (
    eventId: string,
    person1: string,
    person2: string,
  ): Promise<void> => {
    await apiClient.post(`/api/events/${eventId}/couples`, {
      person1,
      person2,
    });
  },

  // Remove couple
  removeCouple: async (eventId: string, coupleId: string): Promise<void> => {
    await apiClient.delete(`/api/events/${eventId}/couples/${coupleId}`);
  },

  // Generate assignments
  generateAssignments: async (
    eventId: string,
    giftCount: number,
  ): Promise<{ assignments: Record<string, string[]> }> => {
    const response = await apiClient.post(`/api/events/${eventId}/generate`, {
      giftCount,
    });
    return response.data;
  },

  // Get codes
  getCodes: async (
    eventId: string,
  ): Promise<{
    assignments: Record<string, string[]>;
    codes: Record<string, string>;
  }> => {
    const response = await apiClient.get(`/api/events/${eventId}/codes`);
    return response.data;
  },

  // Get the current participant's assignment receivers (JWT-scoped)
  getMyAssignments: async (eventId: string): Promise<{ receivers: string[] }> => {
    const response = await apiClient.get(`/api/events/${eventId}/my-assignments`);
    return response.data;
  },
};

export default eventsApi;
