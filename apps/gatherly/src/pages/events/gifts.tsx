import { useEvents } from "contexts/EventsContext";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";

type EventGift = {
  id: string;
  name: string;
  description: string;
  imageDataUrl?: string;
  addedBy?: string;
  claimedBy?: string;
};

export const EventGiftsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: { events }, dispatch } = useEvents();

  const [event, setEvent] = useState<any>(null);
  const [giftName, setGiftName] = useState("");
  const [giftDescription, setGiftDescription] = useState("");
  const [giftImage, setGiftImage] = useState<string | null>(null);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);

  useEffect(() => {
    const foundEvent = events.find((e) => e.id === id);
    if (foundEvent) {
      setEvent(foundEvent);
    }
  }, [id, events]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGiftImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addGift = () => {
    if (!giftName.trim() || !event) return;

    const newGift: EventGift = {
      id: Date.now().toString(),
      name: giftName,
      description: giftDescription,
      imageDataUrl: giftImage || undefined,
    };

    const updatedEvent = {
      ...event,
      gifts: {
        ...event.gifts,
        [newGift.id]: newGift,
      },
    };

    dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
    setEvent(updatedEvent);
    resetForm();
  };

  const updateGift = () => {
    if (!giftName.trim() || !event || !editingGiftId) return;

    const updatedGift: EventGift = {
      ...event.gifts[editingGiftId],
      name: giftName,
      description: giftDescription,
      imageDataUrl: giftImage || event.gifts[editingGiftId]?.imageDataUrl,
    };

    const updatedEvent = {
      ...event,
      gifts: {
        ...event.gifts,
        [editingGiftId]: updatedGift,
      },
    };

    dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
    setEvent(updatedEvent);
    resetForm();
  };

  const deleteGift = (giftId: string) => {
    if (!event) return;

    const { [giftId]: removed, ...remainingGifts } = event.gifts;
    const updatedEvent = {
      ...event,
      gifts: remainingGifts,
    };

    dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
    setEvent(updatedEvent);
  };

  const toggleClaimGift = (giftId: string, claimedBy: string | undefined) => {
    if (!event) return;

    const updatedGift = {
      ...event.gifts[giftId],
      claimedBy: claimedBy ? undefined : "You",
    };

    const updatedEvent = {
      ...event,
      gifts: {
        ...event.gifts,
        [giftId]: updatedGift,
      },
    };

    dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
    setEvent(updatedEvent);
  };

  const startEditGift = (gift: EventGift) => {
    setEditingGiftId(gift.id);
    setGiftName(gift.name);
    setGiftDescription(gift.description || "");
    setGiftImage(gift.imageDataUrl || null);
  };

  const resetForm = () => {
    setGiftName("");
    setGiftDescription("");
    setGiftImage(null);
    setEditingGiftId(null);
  };

  if (!event) {
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

  const gifts = Object.values(event.gifts || {}) as EventGift[];
  const claimedCount = gifts.filter((g) => g.claimedBy).length;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <button
        onClick={() => navigate("/events")}
        className="text-gray-600 hover:text-gray-800 mb-6 flex items-center gap-2"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold text-red-800 mb-2">{event.name}</h1>
      <p className="text-gray-500 mb-6">Gift Registry</p>

      {/* Add Gift Form */}
      <div className="bg-white rounded-lg shadow-sm border border-red-100 p-6 mb-6">
        <h2 className="text-xl font-semibold text-red-800 mb-4">
          {editingGiftId ? "Edit Gift" : "Add Your Gifts"}
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Gift name..."
            value={giftName}
            onChange={(e) => setGiftName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400"
          />
          <textarea
            placeholder="Description (optional)"
            value={giftDescription}
            onChange={(e) => setGiftDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 resize-none"
          />
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Upload image (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
            />
            {giftImage && (
              <div className="mt-2">
                <img
                  src={giftImage}
                  alt="Preview"
                  className="h-20 w-20 object-cover rounded-lg"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={editingGiftId ? updateGift : addGift}
              disabled={!giftName.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {editingGiftId ? "Update Gift" : "Add Gift"}
            </button>
            {editingGiftId && (
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gifts Display */}
      {gifts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
          <p className="text-gray-500 text-lg">
            No gifts added yet. Add some gift ideas above!
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-500">
            {claimedCount} / {gifts.length} gifts claimed
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gifts.map((gift) => (
              <div
                key={gift.id}
                className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {gift.imageDataUrl && (
                  <img
                    src={gift.imageDataUrl}
                    alt={gift.name}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">{gift.name}</h3>
                    <button
                      onClick={() => deleteGift(gift.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {gift.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {gift.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!gift.claimedBy}
                        onChange={() => toggleClaimGift(gift.id, gift.claimedBy)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">
                        I'm buying this
                      </span>
                    </label>
                    <button
                      onClick={() => startEditGift(gift)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Edit
                    </button>
                  </div>
                  {gift.claimedBy && (
                    <div className="mt-2 text-xs text-green-600">
                      Claimed by: {gift.claimedBy}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default EventGiftsPage;
