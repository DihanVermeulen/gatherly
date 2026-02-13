import { useState, useEffect } from "react";
import { X, PartyPopper } from "lucide-react";

type CreateEventFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
  isSubmitting?: boolean;
};

export function CreateEventForm({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: CreateEventFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), description.trim());
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create New Event"
        className="fixed bottom-0 left-0 right-0 z-50 bg-background-light dark:bg-neutral-dark rounded-t-2xl shadow-level-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-neutral-border dark:bg-white/20" />
        </div>

        {/* Top bar */}
        <div className="flex items-center px-4 py-2 justify-between">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-neutral-light dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6 text-neutral-dark dark:text-white" />
          </button>
          <h2 className="text-lg font-bold text-neutral-dark dark:text-white flex-1 text-center pr-12">
            Create New Event
          </h2>
        </div>

        {/* Icon */}
        <div className="flex justify-center py-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <PartyPopper className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-4 pb-4">
          {/* Event Name */}
          <div className="flex flex-col py-3">
            <label
              htmlFor="create-event-name"
              className="text-sm font-semibold text-neutral-dark dark:text-white mb-2"
            >
              Event Name
            </label>
            <input
              id="create-event-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Family Christmas 2024"
              autoFocus
              className="w-full h-14 px-4 rounded-lg border border-neutral-border dark:border-white/10 bg-white dark:bg-white/5 text-neutral-dark dark:text-white placeholder-neutral-medium dark:placeholder-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors text-base"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col py-3">
            <div className="flex justify-between items-center mb-2">
              <label
                htmlFor="create-event-description"
                className="text-sm font-semibold text-neutral-dark dark:text-white"
              >
                Description
              </label>
              <span className="text-xs text-neutral-medium dark:text-white/40 font-medium">
                Optional
              </span>
            </div>
            <textarea
              id="create-event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details like budget, theme, or location..."
              rows={4}
              className="w-full px-4 py-4 rounded-lg border border-neutral-border dark:border-white/10 bg-white dark:bg-white/5 text-neutral-dark dark:text-white placeholder-neutral-medium dark:placeholder-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors text-base resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 pt-6">
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="w-full h-14 rounded-xl bg-primary text-neutral-dark font-bold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Event"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-xl bg-transparent text-neutral-medium dark:text-white/60 font-semibold active:bg-black/5 dark:active:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Safe area spacer */}
        <div className="h-8" />
      </div>
    </>
  );
}
