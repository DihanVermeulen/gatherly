import { useEvents } from "contexts/EventsContext";
import { Copy, Eye, EyeOff, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";

export const EditEventPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: { events }, dispatch } = useEvents();

  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedCouples, setSelectedCouples] = useState<string[][]>([]);
  const [coupleCrossing, setCoupleCrossing] = useState(false);
  const [firstPersonSelected, setFirstPersonSelected] = useState<string | null>(null);
  const [giftCount, setGiftCount] = useState(1);
  const [newPerson, setNewPerson] = useState("");
  const [revealedCodes, setRevealedCodes] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const event = events.find((e) => e.id === id);
    if (event) {
      setEditingEvent({ ...event });
      setSelectedCouples([...(event.couples || [])]);
      setCoupleCrossing(event.coupleCrossing || false);
    }
  }, [id, events]);

  const saveEvent = () => {
    if (editingEvent) {
      dispatch({
        type: 'UPDATE_EVENT',
        payload: {
          ...editingEvent,
          couples: selectedCouples,
          coupleCrossing,
        }
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

    dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
    setEditingEvent(updatedEvent);
    setNewPerson("");
  };

  const removePersonFromEvent = (person: string) => {
    if (!editingEvent) return;

    const updatedEvent = {
      ...editingEvent,
      people: editingEvent.people.filter((p: string) => p !== person),
    };

    dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
    setEditingEvent(updatedEvent);
    setSelectedCouples(selectedCouples.filter((couple) => !couple.includes(person)));
    setFirstPersonSelected(null);
  };

  const generateAssignments = () => {
    if (!editingEvent || editingEvent.people.length < 2) return;

    let people = [...editingEvent.people];
    const targetGiftCount = giftCount;

    const totalGiftsNeeded = people.length * targetGiftCount;
    if (totalGiftsNeeded > people.length * (people.length - 1)) {
      alert(
        `Not enough people! With ${people.length} people, each person can buy for maximum ${people.length - 1} different people.`
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
                  c.includes(receiver)
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
            (r) => receivedCount[r] === minReceived
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
          (person) => receivedCount[person] === targetGiftCount
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

      const element = document.querySelector("[data-generate-button]");
      if (element) {
        element.classList.add("animate-pulse");
        setTimeout(() => element.classList.remove("animate-pulse"), 1000);
      }
    } else {
      alert(
        "Could not generate valid assignments. Try adjusting the number of gifts per person or couple constraints."
      );
    }
  };

  const generateCode = (person: string, assignments: Record<string, string[]>) => {
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
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Event not found</p>
          <button
            onClick={() => navigate("/events")}
            className="mt-4 text-red-600 hover:text-red-700"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <button
        onClick={() => navigate("/events")}
        className="text-gray-600 hover:text-gray-800 mb-6 flex items-center gap-2"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold text-red-800 mb-6">{editingEvent.name}</h1>

      <div className="space-y-6">
        {/* People Management */}
        <div className="bg-white rounded-lg shadow-sm border border-red-100 p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-4">
            Participants
          </h2>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Add person..."
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addPersonToEvent()}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400"
            />
            <button
              onClick={addPersonToEvent}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {editingEvent.people.map((person: string) => (
              <div
                key={person}
                className="bg-red-100 text-red-800 px-3 py-1 rounded-full flex items-center gap-2 text-sm"
              >
                {person}
                <button
                  onClick={() => removePersonFromEvent(person)}
                  className="hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Gift Count Selection */}
        {editingEvent.people.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-red-100 p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-4">
              Gifts Per Person
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              How many people will each person buy gifts for?
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setGiftCount(Math.max(1, giftCount - 1))}
                className="bg-red-600 hover:bg-red-700 text-white w-10 h-10 rounded-lg transition-colors flex items-center justify-center"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <div className="text-4xl font-bold text-red-800">
                  {giftCount}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {giftCount === 1 ? "person" : "people"}
                </p>
              </div>
              <button
                onClick={() =>
                  setGiftCount(
                    Math.min(editingEvent.people.length - 1, giftCount + 1)
                  )
                }
                className="bg-red-600 hover:bg-red-700 text-white w-10 h-10 rounded-lg transition-colors flex items-center justify-center"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Max: {editingEvent.people.length - 1} person
              {editingEvent.people.length - 1 !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Couples Management */}
        {editingEvent.people.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-red-100 p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-4">
              Couples
            </h2>
            <label className="flex items-center gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={coupleCrossing}
                onChange={(e) => setCoupleCrossing(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-gray-700">
                Allow couples to buy for each other
              </span>
            </label>

            {/* Current Couples */}
            {selectedCouples.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-3">
                  Paired Couples
                </h3>
                <div className="space-y-2">
                  {selectedCouples.map((couple, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3"
                    >
                      <span className="text-green-800 font-medium">
                        {couple[0]} ↔ {couple[1]}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedCouples(
                            selectedCouples.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Singles */}
            <h3 className="font-medium text-gray-700 mb-3">
              Create Couple
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {editingEvent.people
                .filter(
                  (p: string) => !selectedCouples.some((c) => c.includes(p))
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
                    className={`text-left px-4 py-2 rounded-lg transition-colors ${
                      firstPersonSelected === person
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-red-100"
                    }`}
                  >
                    {person}
                  </button>
                ))}
            </div>
            {firstPersonSelected && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>{firstPersonSelected}</strong> is selected.
                  Click another person to pair them.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generate Assignments */}
        <button
          onClick={generateAssignments}
          disabled={editingEvent.people.length < 2}
          data-generate-button
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          ✨ Generate Secret Codes
        </button>

        {/* Assignments Display */}
        {editingEvent.assignments && (
          <div className="bg-white rounded-lg shadow-sm border border-green-100 p-6">
            <h2 className="text-xl font-semibold text-green-800 mb-4">
              Secret Codes
            </h2>
            <div className="space-y-3">
              {Object.entries(editingEvent.assignments).map(
                ([person, receivers]) => {
                  const code = generateCode(
                    person,
                    editingEvent.assignments
                  );
                  const isRevealed = revealedCodes[code];
                  return (
                    <div
                      key={person}
                      className="bg-green-50 border border-green-200 rounded-lg p-4"
                    >
                      <div className="font-semibold text-green-900 mb-2">
                        {person}
                      </div>
                      <div className="flex items-center gap-2">
                        <code
                          className={`flex-1 font-mono text-sm ${
                            isRevealed ? "text-gray-800" : "text-gray-400"
                          }`}
                        >
                          {isRevealed ? code : "•".repeat(code.length)}
                        </code>
                        <button
                          onClick={() => toggleCodeReveal(code)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {isRevealed ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => copyCode(code)}
                          className={`transition-colors ${
                            copiedCode === code
                              ? "text-green-600"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          <Copy size={18} />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
            <button
              onClick={generateAssignments}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Regenerate Codes
            </button>
          </div>
        )}

        <button
          onClick={saveEvent}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors font-medium"
        >
          Save Event
        </button>
      </div>
    </div>
  );
};

export default EditEventPage;
