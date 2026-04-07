import apiClient from "./client";

export type TWishlistItem = {
  id: number;
  eventId: number;
  participantId: number;
  participantName?: string;
  itemName: string;
  description?: string;
  imageUrl?: string;
  productUrl?: string;
  priority: "low" | "medium" | "high";
  pricePence?: number | null;
  isClaimed: boolean;
  claimedByMe: boolean;
  claimedBy?: number;
  claimedByName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TEvent = {
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
  wishlists?: TWishlistItem[];
  hash?: string;
  description?: string;
  // Phase 22 additions
  eventDate?: string | null;
  wishlistDeadline?: string | null;
  totalWishlistCount?: number;
  claimedCount?: number;
  // Phase 24 additions
  featureFlags?: Record<string, any>;
  // Phase 25 additions
  planTier?: 'free' | 'premium';
  // Phase 30 additions
  hasCoverPhoto?: boolean;
  // Phase 32 additions
  coverPhotoUrl?: string | null;
  location?: string | null;
  allowGuestInvites?: boolean;
  isPublic?: boolean;
  organizerName?: string | null;
};

export type TEventModule = {
  id: number;
  eventId: number;
  moduleType: 'gift_exchange' | 'polls' | 'potluck' | 'rsvp' | 'white_elephant';
  config: Record<string, any>;
  status: 'active' | 'closed' | 'draft';
  sortOrder: number;
};

// Type aliases for backward compatibility
export type Event = TEvent;
export type WishlistItem = TWishlistItem;

export const eventsApi = {
  // Get all events
  getAll: async (): Promise<TEvent[]> => {
    const response = await apiClient.get("/api/events");
    return response.data;
  },

  // Get single event
  getById: async (id: string): Promise<TEvent> => {
    const response = await apiClient.get(`/api/events/${id}`);
    return response.data;
  },

  // Create event
  create: async (name: string, coupleCrossing = false): Promise<TEvent> => {
    const response = await apiClient.post("/api/events", {
      name,
      coupleCrossing,
    });
    return response.data;
  },

  // Update event
  update: async (id: string, event: Partial<TEvent>): Promise<TEvent> => {
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

  // Upgrade event to premium
  upgradeEvent: async (id: string): Promise<TEvent> => {
    const response = await apiClient.patch(`/api/events/${id}/upgrade`);
    return response.data;
  },
};

export default eventsApi;
