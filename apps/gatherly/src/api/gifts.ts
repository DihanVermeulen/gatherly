import apiClient from "./client";

export type Gift = {
  id: string;
  name: string;
  description?: string;
  imageDataUrl?: string;
  addedBy?: string;
  claimedBy?: string;
  createdAt?: string;
};

export const giftsApi = {
  // Get all gifts for an event
  getAll: async (eventId: string): Promise<Gift[]> => {
    const response = await apiClient.get(`/api/events/${eventId}/gifts`);
    return response.data;
  },

  // Add gift
  add: async (
    eventId: string,
    gift: {
      name: string;
      description?: string;
      imageDataUrl?: string;
      addedBy?: string;
    }
  ): Promise<Gift> => {
    const response = await apiClient.post(`/api/events/${eventId}/gifts`, gift);
    return response.data;
  },

  // Update gift
  update: async (
    eventId: string,
    giftId: string,
    gift: {
      name?: string;
      description?: string;
      imageDataUrl?: string;
    }
  ): Promise<Gift> => {
    const response = await apiClient.put(
      `/api/events/${eventId}/gifts/${giftId}`,
      gift
    );
    return response.data;
  },

  // Delete gift
  delete: async (eventId: string, giftId: string): Promise<void> => {
    await apiClient.delete(`/api/events/${eventId}/gifts/${giftId}`);
  },

  // Claim gift
  claim: async (
    eventId: string,
    giftId: string,
    claimedBy: string
  ): Promise<void> => {
    await apiClient.post(`/api/events/${eventId}/gifts/${giftId}/claim`, {
      claimedBy,
    });
  },

  // Unclaim gift
  unclaim: async (eventId: string, giftId: string): Promise<void> => {
    await apiClient.delete(`/api/events/${eventId}/gifts/${giftId}/claim`);
  },
};

export default giftsApi;
