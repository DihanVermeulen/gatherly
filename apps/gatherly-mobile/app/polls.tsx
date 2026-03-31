import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Plus, Trash2, X } from "lucide-react-native";

import { modulesApi, TPoll } from "./api/modules";
import { useSession } from "./contexts/AuthContext";
import { useEvents } from "./contexts/EventsContext";

import { PaywallModal } from "@/components/PaywallModal";

import { Text } from "@/components/ui/text";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@/components/ui/modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";

export default function PollsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const isOrganizer = user?.participantId === undefined;
  const isParticipant = !isOrganizer;

  const {
    state: { events },
  } = useEvents();
  const event = events.find((e) => e.id === id) ?? null;
  const isFree = (event?.planTier ?? "free") === "free";

  const [showPaywall, setShowPaywall] = useState(false);
  const [polls, setPolls] = useState<TPoll[]>([]);
  const [loading, setLoading] = useState(true);

  // Create poll form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Vote state
  const [votingPollId, setVotingPollId] = useState<number | null>(null);
  const [pendingVotes, setPendingVotes] = useState<Record<number, number[]>>(
    {},
  );
  const [submittingVote, setSubmittingVote] = useState<number | null>(null);

  const loadPolls = useCallback(async () => {
    try {
      const data = await modulesApi.getPolls(id);
      setPolls(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  const handleCreatePoll = async () => {
    const trimmedQ = question.trim();
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!trimmedQ) {
      setCreateError("Please enter a question.");
      return;
    }
    if (trimmedOptions.length < 2) {
      setCreateError("Please enter at least 2 options.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      await modulesApi.createPoll(id, {
        question: trimmedQ,
        allowMultiple,
        options: trimmedOptions,
      });
      setShowCreateModal(false);
      setQuestion("");
      setOptions(["", ""]);
      setAllowMultiple(false);
      await loadPolls();
    } catch (err: unknown) {
      const errorCode = (
        err as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      if (errorCode === "trial_limit_reached") {
        setShowCreateModal(false);
        setShowPaywall(true);
      } else {
        setCreateError("Failed to create poll. Please try again.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePoll = async (pollId: number) => {
    try {
      await modulesApi.deletePoll(id, pollId);
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
    } catch {
      // ignore
    }
  };

  const handleVoteToggle = (poll: TPoll, optionId: number) => {
    setPendingVotes((prev) => {
      const current = prev[poll.id] ?? [...poll.myVotes];
      if (poll.allowMultiple) {
        if (current.includes(optionId)) {
          return {
            ...prev,
            [poll.id]: current.filter((id) => id !== optionId),
          };
        }
        return { ...prev, [poll.id]: [...current, optionId] };
      }
      // Single choice
      return {
        ...prev,
        [poll.id]: current.includes(optionId) ? [] : [optionId],
      };
    });
  };

  const handleSubmitVote = async (poll: TPoll) => {
    const selectedIds = pendingVotes[poll.id] ?? poll.myVotes;
    if (selectedIds.length === 0) return;

    setSubmittingVote(poll.id);
    try {
      await modulesApi.vote(id, poll.id, selectedIds);
      await loadPolls();
      setVotingPollId(null);
    } catch {
      // ignore
    } finally {
      setSubmittingVote(null);
    }
  };

  const hasVoted = (poll: TPoll) => poll.myVotes.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background-50" edges={["bottom"]}>
      {/* Header */}
      <AppHeader
        title="Polls"
        onBack={() => router.back()}
        rightAction={
          isOrganizer
            ? {
                icon: <Plus size={20} color="white" />,
                onPress: () => {
                  if (isFree && polls.length >= 1) {
                    setShowPaywall(true);
                  } else {
                    setShowCreateModal(true);
                  }
                },
                style: { backgroundColor: "#0d9488" },
              }
            : undefined
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingHorizontal: 16,
          paddingTop: 8,
        }}
      >
        {/* Free-tier poll counter */}
        {isFree && isOrganizer && !loading && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fffbeb",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 13, color: "#92400e", fontWeight: "600" }}>
              {polls.length} of 1 polls used
            </Text>
            <Text style={{ fontSize: 13, color: "#92400e", marginLeft: 4 }}>
              · Upgrade for unlimited
            </Text>
          </View>
        )}

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#0d9488" />
          </View>
        ) : polls.length === 0 ? (
          <View className="items-center py-16 px-8">
            <Text className="text-4xl mb-3">📊</Text>
            <Text className="text-base font-bold text-typography-700 text-center">
              No polls yet
            </Text>
            <Text className="text-sm text-typography-400 text-center mt-1">
              {isOrganizer
                ? "Tap + to create your first poll."
                : "The organizer hasn't created any polls yet."}
            </Text>
          </View>
        ) : (
          polls.map((poll) => {
            const voted = hasVoted(poll);
            const isVoting = votingPollId === poll.id;
            const pending = pendingVotes[poll.id] ?? poll.myVotes;

            return (
              <View
                key={poll.id}
                className="rounded-2xl bg-white border border-outline-100 p-4 mb-4"
              >
                {/* Question row */}
                <View className="flex-row items-start justify-between mb-3">
                  <Text className="text-sm font-bold text-typography-900 flex-1 mr-2 leading-5">
                    {poll.question}
                  </Text>
                  {isOrganizer && (
                    <Pressable
                      onPress={() => handleDeletePoll(poll.id)}
                      className="h-8 w-8 rounded-full bg-background-100 items-center justify-center active:opacity-70"
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </Pressable>
                  )}
                </View>

                {/* Options */}
                {poll.options.map((option) => {
                  const isSelected = pending.includes(option.id);
                  const pct =
                    poll.totalVotes > 0
                      ? Math.round((option.voteCount / poll.totalVotes) * 100)
                      : 0;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        !voted || isVoting
                          ? handleVoteToggle(poll, option.id)
                          : null
                      }
                      className="rounded-xl overflow-hidden mb-2"
                    >
                      <View className="relative h-10 justify-center px-3 border border-outline-100 rounded-xl overflow-hidden">
                        {/* Progress bar background */}
                        {voted && (
                          <View
                            className="absolute left-0 top-0 bottom-0 rounded-xl"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: isSelected
                                ? "#ccfbf1"
                                : "#f1f5f9",
                            }}
                          />
                        )}
                        <View className="flex-row items-center justify-between z-10">
                          <Text
                            className="text-sm font-medium"
                            style={{
                              color: isSelected ? "#0f766e" : "#374151",
                            }}
                          >
                            {option.optionText}
                          </Text>
                          {voted && (
                            <Text className="text-xs text-typography-500 font-semibold">
                              {pct}% ({option.voteCount})
                            </Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}

                {/* Footer */}
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-xs text-typography-400">
                    {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
                    {poll.allowMultiple ? " · Multi-choice" : ""}
                  </Text>
                  {!voted && !isOrganizer && (
                    <Button
                      size="sm"
                      className="rounded-xl"
                      style={{ backgroundColor: "#0d9488" }}
                      onPress={() => {
                        setVotingPollId(poll.id);
                        handleSubmitVote(poll);
                      }}
                      disabled={
                        submittingVote === poll.id ||
                        (pendingVotes[poll.id] ?? []).length === 0
                      }
                    >
                      {submittingVote === poll.id ? (
                        <ButtonSpinner color="white" />
                      ) : null}
                      <ButtonText className="text-white font-semibold text-xs">
                        Submit Vote
                      </ButtonText>
                    </Button>
                  )}
                  {voted && !isOrganizer && (
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: "#0d9488" }}
                    >
                      ✓ Voted
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create Poll Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text className="text-lg font-bold text-typography-900">
              Create Poll
            </Text>
            <ModalCloseButton onPress={() => setShowCreateModal(false)}>
              <X size={20} color="#64748b" />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            {/* Question input */}
            <Text className="text-xs font-bold text-typography-600 uppercase tracking-wide mb-1">
              Question
            </Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="e.g. What time should we start?"
              placeholderTextColor="#94a3b8"
              style={{
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: "#0f172a",
                marginBottom: 16,
              }}
            />

            {/* Options */}
            <Text className="text-xs font-bold text-typography-600 uppercase tracking-wide mb-2">
              Options
            </Text>
            {options.map((opt, idx) => (
              <View key={idx} className="flex-row items-center mb-2">
                <TextInput
                  value={opt}
                  onChangeText={(val) => {
                    const next = [...options];
                    next[idx] = val;
                    setOptions(next);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor="#94a3b8"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 14,
                    color: "#0f172a",
                  }}
                />
                {options.length > 2 && (
                  <Pressable
                    onPress={() =>
                      setOptions(options.filter((_, i) => i !== idx))
                    }
                    className="ml-2 h-8 w-8 rounded-full bg-background-100 items-center justify-center active:opacity-70"
                  >
                    <X size={14} color="#64748b" />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable
              onPress={() => setOptions([...options, ""])}
              className="flex-row items-center gap-1.5 mt-1 mb-4"
            >
              <Plus size={14} color="#0d9488" />
              <Text
                className="text-sm font-semibold"
                style={{ color: "#0d9488" }}
              >
                Add option
              </Text>
            </Pressable>

            {createError && (
              <View
                className="rounded-xl px-3 py-2 mb-2"
                style={{ backgroundColor: "#fef2f2" }}
              >
                <Text
                  className="text-xs text-center"
                  style={{ color: "#dc2626" }}
                >
                  {createError}
                </Text>
              </View>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              className="flex-1 mr-2 rounded-xl border-outline-300"
              onPress={() => setShowCreateModal(false)}
            >
              <ButtonText className="text-typography-700">Cancel</ButtonText>
            </Button>
            <Button
              className="flex-1 rounded-xl"
              style={{ backgroundColor: "#0d9488" }}
              onPress={handleCreatePoll}
              disabled={creating}
            >
              {creating ? <ButtonSpinner color="white" /> : null}
              <ButtonText className="text-white font-semibold ml-1">
                Create Poll
              </ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="polls_trial"
        eventId={id}
        isParticipant={isParticipant}
      />
    </SafeAreaView>
  );
}
