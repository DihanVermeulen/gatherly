import apiClient from "./client";
import { WishlistItem } from "./events";

export const wishlistsApi = {
  // Get all wishlist items for an event
  getAll: async (eventId: string): Promise<WishlistItem[]> => {
    const response = await apiClient.get(`/api/events/${eventId}/wishlists`);
    return response.data;
  },

  // Create wishlist item
  create: async (
    eventId: string,
    item: {
      participantId: number;
      itemName: string;
      description?: string;
      imageUrl?: string;
      productUrl?: string;
      priority?: 'low' | 'medium' | 'high';
    }
  ): Promise<WishlistItem> => {
    const response = await apiClient.post(`/api/events/${eventId}/wishlists`, item);
    return response.data;
  },

  // Update wishlist item
  update: async (
    eventId: string,
    itemId: number,
    item: {
      participantId: number;
      itemName: string;
      description?: string;
      imageUrl?: string;
      productUrl?: string;
      priority?: 'low' | 'medium' | 'high';
    }
  ): Promise<WishlistItem> => {
    const response = await apiClient.put(`/api/events/${eventId}/wishlists/${itemId}`, item);
    return response.data;
  },

  // Delete wishlist item
  delete: async (eventId: string, itemId: number, participantId: number): Promise<void> => {
    await apiClient.delete(`/api/events/${eventId}/wishlists/${itemId}`, {
      data: { participantId }
    });
  },
};

export default wishlistsApi;
