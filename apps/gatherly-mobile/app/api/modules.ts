import apiClient from "./client";
import { TEventModule } from "./events";

export type TPollOption = {
  id: number;
  optionText: string;
  sortOrder: number;
  voteCount: number;
};

export type TPoll = {
  id: number;
  question: string;
  allowMultiple: boolean;
  deadline?: string | null;
  createdAt: string;
  options: TPollOption[];
  myVotes: number[];
  totalVotes: number;
};

export type TCreatePoll = {
  question: string;
  allowMultiple?: boolean;
  deadline?: string | null;
  options: string[];
};

export type TRsvpResponse = {
  id: number;
  participantId: number;
  participantName: string;
  status: 'accepted' | 'declined' | 'maybe' | 'pending';
  headcount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type TRsvpSummary = {
  responses: TRsvpResponse[];
  summary: {
    total: number;
    accepted: number;
    declined: number;
    maybe: number;
    pending: number;
    totalHeadcount: number;
  };
};

export type TRsvpData = {
  status: 'accepted' | 'declined' | 'maybe' | 'pending';
  headcount?: number;
  note?: string;
};

export const modulesApi = {
  getModules: async (eventId: string): Promise<TEventModule[]> => {
    const response = await apiClient.get(`/api/events/${eventId}/modules`);
    return response.data;
  },

  setModules: async (
    eventId: string,
    modules: Array<{ type: string; config?: object; status?: string }>,
  ): Promise<TEventModule[]> => {
    const response = await apiClient.put(`/api/events/${eventId}/modules`, { modules });
    return response.data;
  },

  getPolls: async (eventId: string): Promise<TPoll[]> => {
    const response = await apiClient.get(`/api/events/${eventId}/polls`);
    return response.data;
  },

  createPoll: async (eventId: string, data: TCreatePoll): Promise<TPoll> => {
    const response = await apiClient.post(`/api/events/${eventId}/polls`, data);
    return response.data;
  },

  deletePoll: async (eventId: string, pollId: number): Promise<void> => {
    await apiClient.delete(`/api/events/${eventId}/polls/${pollId}`);
  },

  vote: async (eventId: string, pollId: number, optionIds: number[]): Promise<void> => {
    await apiClient.post(`/api/events/${eventId}/polls/${pollId}/vote`, { optionIds });
  },

  getRsvp: async (eventId: string): Promise<TRsvpSummary> => {
    const response = await apiClient.get(`/api/events/${eventId}/rsvp`);
    return response.data;
  },

  submitRsvp: async (eventId: string, data: TRsvpData): Promise<void> => {
    await apiClient.post(`/api/events/${eventId}/rsvp`, data);
  },
};

export default modulesApi;
