import { useEvents } from "contexts/EventsContext";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowRight,
  Check,
  Copy,
  Dices,
  Eye,
  EyeOff,
  Link2Off,
  Minus,
  Plus,
  X,
} from "lucide-react";

export const EditEventPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    state: { events },
    dispatch,
  } = useEvents();

  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedCouples, setSelectedCouples] = useState<string[][]>([]);
  const [coupleCrossing, setCoupleCrossing] = useState(false);
  const [firstPersonSelected, setFirstPersonSelected] = useState<string | null>(
    null,
  );
  const [giftCount, setGiftCount] = useState(1);
  const [newPerson, setNewPerson] = useState("");
  const [revealedCodes, setRevealedCodes] = useState<Record<string, boolean>>(
    {},
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const event = events.find((e) => e.id === id);
    if (event) {
      setEditingEvent({ ...event });
      setSelectedCouples([...(event.couples || [])]);
      setCoupleCrossing(event.coupleCrossing || false);
      // Assuming giftCount isn't stored in the original model but we can derive it or keep it in local state
    }
  }, [id, events]);

  const saveEvent = () => {
    if (editingEvent) {
      dispatch({
        type: "UPDATE_EVENT",
        payload: {
          ...editingEvent,
          couples: selectedCouples,
          coupleCrossing,
        },
      });
    }
    navigate("/events");
  };

  const addPersonToEvent = () => {
    if (!newPerson.trim() || !editingEvent) return;
    if (editingEvent.people.includes(newPerson)) return;

    const updatedEvent = {
      ...editingEvent,
      people: [...editingEvent.people, newPerson],
    };

    setEditingEvent(updatedEvent);
    setNewPerson("");
  };

  const removePersonFromEvent = (person: string) => {
    if (!editingEvent) return;

    const updatedEvent = {
      ...editingEvent,
      people: editingEvent.people.filter((p: string) => p !== person),
    };

    setEditingEvent(updatedEvent);
    setSelectedCouples(
      selectedCouples.filter((couple) => !couple.includes(person)),
    );
    setFirstPersonSelected(null);
  };

  const generateAssignments = () => {
    if (!editingEvent || editingEvent.people.length < 2) return;

    let people = [...editingEvent.people];
    const targetGiftCount = giftCount;

    const totalGiftsNeeded = people.length * targetGiftCount;
    if (totalGiftsNeeded > people.length * (people.length - 1)) {
      alert(
        `Not enough people! With ${people.length} people, each person can buy for maximum ${people.length - 1} different people.`,
      );
      return;
    }

    let assignments: Record<string, string[]> | null = null;
    let attempts = 0;

    while (!assignments && attempts < 2000) {
      attempts++;
      let tempAssignments: Record<string, string[]> = {};
      let receivedCount: Record<string, number> = {};

      people.forEach((person) => {
        tempAssignments[person] = [];
        receivedCount[person] = 0;
      });

      let valid = true;

      for (const giver of people) {
        let giverCouple = selectedCouples.find((c) => c.includes(giver));
        let assigned = new Set<string>();

        for (let i = 0; i < targetGiftCount; i++) {
          let validReceivers = people
            .filter((receiver) => {
              if (receiver === giver) return false;
              if (assigned.has(receiver)) return false;
              if (!coupleCrossing && giverCouple) {
                let receiverCouple = selectedCouples.find((c) =>
                  c.includes(receiver),
                );
                if (receiverCouple && giverCouple === receiverCouple)
                  return false;
              }
              return true;
            })
            .sort((a, b) => receivedCount[a] - receivedCount[b]);

          if (validReceivers.length === 0) {
            valid = false;
            break;
          }

          const minReceived = receivedCount[validReceivers[0]];
          const candidates = validReceivers.filter(
            (r) => receivedCount[r] === minReceived,
          );
          const receiver =
            candidates[Math.floor(Math.random() * candidates.length)];

          tempAssignments[giver].push(receiver);
          assigned.add(receiver);
          receivedCount[receiver]++;
        }

        if (!valid) break;
      }

      if (valid) {
        const allCorrect = people.every(
          (person) => receivedCount[person] === targetGiftCount,
        );
        if (allCorrect) {
          assignments = tempAssignments;
        }
      }
    }

    if (assignments) {
      setEditingEvent({
        ...editingEvent,
        assignments,
        hash: Math.random().toString(36).substring(2, 15),
      });
    } else {
      alert(
        "Could not generate valid assignments. Try adjusting the number of gifts per person or couple constraints.",
      );
    }
  };

  const generateCode = (
    person: string,
    assignments: Record<string, string[]>,
  ) => {
    const receivers = assignments[person]?.join(",") || "";
    return btoa(`${person}:${receivers}`);
  };

  const toggleCodeReveal = (code: string) => {
    setRevealedCodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!editingEvent) {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen p-6 text-center">
        <p className="text-slate-500">Event not found</p>
        <button
          onClick={() => navigate("/events")}
          className="mt-4 text-primary font-bold"
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen pb-32 font-sans -mt-20">
      {/* Top App Bar */}
      <div className=" bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <span
              onClick={() => navigate("/events")}
              className="material-symbols-outlined cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 p-1 rounded-full transition-colors"
            >
              arrow_back
            </span>
            <h2 className="text-lg font-bold leading-tight tracking-tight">
              {editingEvent.name}
            </h2>
          </div>
          <span className="material-symbols-outlined text-primary cursor-pointer">
            settings
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto">
        {/* Participants Section */}
        <section className="mt-4">
          <h3 className="text-lg font-bold px-4 pb-2 pt-4">Participants</h3>
          <div className="flex gap-2 p-4 flex-wrap">
            {editingEvent.people.map((person: string) => (
              <div
                key={person}
                className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary/20 dark:bg-primary/10 border border-primary/30 pl-3 pr-2"
              >
                <p className="text-sm font-semibold">{person}</p>
                <span
                  onClick={() => removePersonFromEvent(person)}
                  className="text-[18px] cursor-pointer hover:text-red-500"
                >
                  <X />
                </span>
              </div>
            ))}
            {editingEvent.people.length === 0 && (
              <p className="text-slate-400 italic text-sm px-2">
                No participants yet
              </p>
            )}
          </div>
          <div className="px-4 py-2">
            <div className="flex w-full items-stretch rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <input
                className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-sm dark:text-white"
                placeholder="Enter friend's name"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPersonToEvent()}
              />
              <button
                onClick={addPersonToEvent}
                className="bg-primary text-black px-4 flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined font-bold">add</span>
              </button>
            </div>
          </div>
        </section>

        {/* Wishlists Section */}
        <section className="mt-6">
          <h3 className="text-lg font-bold px-4 pb-2 pt-4">Wishlists</h3>
          <div className="px-4 py-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              View and manage wishlist items for each participant
            </p>
            <div className="space-y-2">
              {editingEvent.people && editingEvent.people.length > 0 ? (
                editingEvent.people.map((participant: string) => (
                  <button
                    key={participant}
                    onClick={() =>
                      navigate(
                        `/events/${editingEvent.id}/wishlist/${participant}`,
                      )
                    }
                    className="w-full flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 dark:bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {participant.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">
                        {participant}'s Wishlist
                      </span>
                    </div>
                    <span className="text-slate-400">
                      <ArrowRight />
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-400 italic px-2">
                  Add participants to enable wishlists
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Gifts Per Person Section */}
        <section className="mt-6">
          <h3 className="text-lg font-bold px-4 pb-2 pt-4">Gifts Per Person</h3>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-sm font-medium">
                Number of gifts each participant gives
              </span>
              <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setGiftCount(Math.max(1, giftCount - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <span className="text-sm">
                    <Minus />
                  </span>
                </button>
                <span className="w-4 text-center font-bold">{giftCount}</span>
                <button
                  onClick={() =>
                    setGiftCount(
                      Math.min(
                        editingEvent.people.length - 1 || 1,
                        giftCount + 1,
                      ),
                    )
                  }
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <span className="text-sm">
                    <Plus />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Couples Section */}
        <section className="mt-6 px-4">
          <h3 className="text-lg font-bold pb-2 pt-4">Pairing Rules</h3>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium">
                Allow couples to buy for each other
              </span>
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={coupleCrossing}
                  onChange={(e) => setCoupleCrossing(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </div>
            </label>
            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-xs text-slate-500 mb-4 font-medium uppercase tracking-wider">
                Define Exclusions
              </p>
              <div className="space-y-3">
                {selectedCouples.map((couple, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 text-xs font-semibold bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 text-center">
                      {couple[0]}
                    </div>
                    <span
                      onClick={() =>
                        setSelectedCouples(
                          selectedCouples.filter((_, i) => i !== idx),
                        )
                      }
                      className="material-symbols-outlined text-slate-400 text-sm cursor-pointer hover:text-red-500"
                    >
                      <Link2Off />
                    </span>
                    <div className="flex-1 text-xs font-semibold bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 text-center">
                      {couple[1]}
                    </div>
                  </div>
                ))}

                {/* Couple creation UI integrated into exclusions list */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50">
                  <div className="flex flex-wrap gap-1">
                    {editingEvent.people
                      .filter(
                        (p: string) =>
                          !selectedCouples.some((c) => c.includes(p)),
                      )
                      .map((person: string) => (
                        <button
                          key={person}
                          onClick={() => {
                            if (firstPersonSelected === person) {
                              setFirstPersonSelected(null);
                            } else if (!firstPersonSelected) {
                              setFirstPersonSelected(person);
                            } else {
                              setSelectedCouples([
                                ...selectedCouples,
                                [firstPersonSelected, person],
                              ]);
                              setFirstPersonSelected(null);
                            }
                          }}
                          className={`text-[10px] px-2 py-1 rounded transition-colors ${
                            firstPersonSelected === person
                              ? "bg-primary text-black"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {person}
                        </button>
                      ))}
                  </div>
                </div>
                {firstPersonSelected && (
                  <p className="text-[10px] text-primary italic">
                    Select another person to pair with {firstPersonSelected}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Generate Section */}
        <section className="mt-8 px-4">
          <button
            onClick={generateAssignments}
            className="w-full bg-primary hover:opacity-90 text-black font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <span className="">
              <Dices />
            </span>
            Generate Secret Codes
          </button>
        </section>

        {/* Secret Codes List */}
        {editingEvent.assignments && (
          <section className="mt-8 px-4 pb-12">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">Secret Access Codes</h3>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                Generated Today
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(
                editingEvent.assignments as Record<string, string[]>,
              ).map(([person, receivers]) => {
                const code = generateCode(person, editingEvent.assignments);
                const isRevealed = revealedCodes[code];
                return (
                  <div
                    key={person}
                    className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{person}</span>
                      <span className="text-xs font-mono text-slate-400">
                        {isRevealed ? code : "••••••"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCodeReveal(code)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                      >
                        <span className="text-xl">
                          {isRevealed ? <EyeOff /> : <Eye />}
                        </span>
                      </button>
                      <button
                        onClick={() => copyCode(code)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">
                          {copiedCode === code ? <Check /> : <Copy />}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-4 safe-area-bottom">
        <div className="max-w-md mx-auto sm:ml-auto sm:mr-0 flex gap-4">
          <button
            onClick={() => navigate("/events")}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveEvent}
            className="flex-[2] py-3 px-4 rounded-xl font-bold text-sm text-black bg-primary shadow-lg shadow-primary/20 hover:opacity-95 transition-opacity"
          >
            Save Event
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditEventPage;
