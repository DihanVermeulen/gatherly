import React, { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { CreateGiftForm, RegistryList } from "components/gift-registry";
import { useGifts } from "contexts/GiftsContext";
import type { Gift } from "types/gift";
import { ChevronLeft } from "lucide-react";

/**
 * Gift Registry screen: create and view gifts.
 * - Primary objective: Let users add gifts (name, recipient, occasion, due date, budget, link, image, privacy) and view/filter/sort them in a card list.
 * - Layout: Header (back + title) → Create section → Registry list (filters + cards or empty state).
 */
export const GiftRegistryPage: React.FC = () => {
  const navigate = useNavigate();
  const createSectionRef = useRef<HTMLDivElement>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [saving, setSaving] = useState(false);
  const { dispatch } = useGifts();

  const scrollToCreate = useCallback(() => {
    createSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSubmit = useCallback(
    (gift: Gift) => {
      setSaving(true);
      // Simulate brief async for UX (e.g. future API call)
      setTimeout(() => {
        if (editingGift) {
          dispatch({ type: "UPDATE_GIFT", payload: gift });
          setSuccessMessage("Gift updated.");
        } else {
          dispatch({ type: "ADD_GIFT", payload: gift });
          setSuccessMessage("Gift added to registry!");
        }
        setEditingGift(null);
        setSaving(false);
      }, 300);
    },
    [dispatch, editingGift],
  );

  const handleEdit = useCallback(
    (gift: Gift) => {
      setEditingGift(gift);
      scrollToCreate();
    },
    [scrollToCreate],
  );

  const dismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 border-b border-red-100 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label="Go back"
          >
            <ChevronLeft size={24} aria-hidden />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Gift Registry</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Create Gift section */}
        <div ref={createSectionRef}>
          <CreateGiftForm
            onSubmit={handleSubmit}
            loading={saving}
            successMessage={successMessage}
            onSuccessDismiss={dismissSuccess}
            initialGift={editingGift}
            submitLabel={editingGift ? "Save changes" : "Add to Registry"}
          />
        </div>

        {/* Registry List */}
        <RegistryList
          onEditGift={handleEdit}
          onScrollToCreate={scrollToCreate}
          currentUserName={null}
        />
      </div>
    </div>
  );
};
