import React, { useCallback, useRef, useState } from "react";
import {
  GIFT_NAME_MAX,
  DESCRIPTION_MAX,
  STORE_LINK_MAX,
  validateGiftForm,
  isGiftFormValid,
} from "core/giftValidation";
import type { Gift, GiftFormData, GiftPrivacy } from "types/gift";
import { Plus, Upload, X } from "lucide-react";

const DEFAULT_FORM: GiftFormData = {
  name: "",
  recipient: "",
  occasion: "",
  dueDate: "",
  budget: "",
  storeLink: "",
  description: "",
  imageDataUrl: null,
  privacy: "everyone",
};

const PRIVACY_OPTIONS: { value: GiftPrivacy; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "santa_only", label: "Santa only" },
  { value: "private", label: "Private" },
];

function toIsoDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

type CreateGiftFormProps = {
  onSubmit: (gift: Gift) => void;
  loading?: boolean;
  successMessage?: string | null;
  onSuccessDismiss?: () => void;
  /** When provided, form acts in edit mode and pre-fills */
  initialGift?: Gift | null;
  submitLabel?: string;
};

function giftToFormData(g: Gift): GiftFormData {
  return {
    name: g.name,
    recipient: g.recipient,
    occasion: g.occasion,
    dueDate: toIsoDate(g.dueDate),
    budget: g.budget ?? "",
    storeLink: g.storeLink,
    description: g.description,
    imageDataUrl: g.imageDataUrl,
    privacy: g.privacy,
  };
}

export const CreateGiftForm: React.FC<CreateGiftFormProps> = ({
  onSubmit,
  loading = false,
  successMessage = null,
  onSuccessDismiss,
  initialGift = null,
  submitLabel = "Add to Registry",
}) => {
  const [form, setForm] = useState<GiftFormData>(() =>
    initialGift ? giftToFormData(initialGift) : { ...DEFAULT_FORM, dueDate: toIsoDate("") }
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errors = validateGiftForm({
    ...form,
    dueDate: form.dueDate,
    privacy: form.privacy,
  });
  const valid = isGiftFormValid(errors);

  const update = useCallback(
    (updates: Partial<GiftFormData>) => {
      setForm((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const blur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        update({ imageDataUrl: dataUrl });
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [update]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!valid || loading) return;
      const now = new Date().toISOString();
      const budget =
        form.budget === "" ? null : Number(form.budget);
      const gift: Gift = {
        id: initialGift ? initialGift.id : `gift-${Date.now()}`,
        name: form.name.trim(),
        recipient: form.recipient.trim(),
        occasion: form.occasion.trim(),
        dueDate: form.dueDate,
        budget,
        storeLink: form.storeLink.trim(),
        description: form.description.trim(),
        imageDataUrl: form.imageDataUrl,
        privacy: form.privacy as GiftPrivacy,
        status: initialGift?.status ?? "available",
        claimedBy: initialGift?.claimedBy,
        createdAt: initialGift?.createdAt ?? now,
        updatedAt: now,
      };
      onSubmit(gift);
      if (!initialGift) {
        setForm({ ...DEFAULT_FORM, dueDate: toIsoDate("") });
        setTouched({});
      }
    },
    [valid, loading, form, initialGift, onSubmit]
  );

  const showError = (field: keyof typeof errors) =>
    touched[field] !== false && errors[field];

  return (
    <section
      aria-labelledby="create-gift-heading"
      className="bg-white/95 rounded-xl border border-red-100 shadow-sm p-6 md:p-8"
    >
      <h2
        id="create-gift-heading"
        className="text-xl font-semibold text-gray-900 mb-6"
      >
        Add Your Gifts
      </h2>

      {successMessage && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between"
        >
          <span className="text-green-800 text-sm">{successMessage}</span>
          {onSuccessDismiss && (
            <button
              type="button"
              onClick={onSuccessDismiss}
              className="text-green-600 hover:text-green-800 p-1"
              aria-label="Dismiss success message"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="gift-name" className="block text-sm font-medium text-gray-700 mb-1">
            Gift Name <span className="text-red-600">*</span>
          </label>
          <input
            id="gift-name"
            type="text"
            required
            maxLength={GIFT_NAME_MAX}
            placeholder="What do you want?"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            onBlur={() => blur("name")}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 aria-invalid:border-red-500"
            aria-invalid={!!showError("name")}
            aria-describedby={showError("name") ? "gift-name-error" : undefined}
          />
          {showError("name") && (
            <p id="gift-name-error" className="mt-1 text-sm text-red-600">
              {errors.name}
            </p>
          )}
          <p className="mt-0.5 text-xs text-gray-500">
            {form.name.length}/{GIFT_NAME_MAX}
          </p>
        </div>

        <div>
          <label htmlFor="gift-recipient" className="block text-sm font-medium text-gray-700 mb-1">
            Recipient <span className="text-red-600">*</span>
          </label>
          <input
            id="gift-recipient"
            type="text"
            required
            maxLength={80}
            placeholder="Who is this gift for?"
            value={form.recipient}
            onChange={(e) => update({ recipient: e.target.value })}
            onBlur={() => blur("recipient")}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 aria-invalid:border-red-500"
            aria-invalid={!!showError("recipient")}
            aria-describedby={showError("recipient") ? "gift-recipient-error" : undefined}
          />
          {showError("recipient") && (
            <p id="gift-recipient-error" className="mt-1 text-sm text-red-600">
              {errors.recipient}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="gift-occasion" className="block text-sm font-medium text-gray-700 mb-1">
            Occasion <span className="text-red-600">*</span>
          </label>
          <input
            id="gift-occasion"
            type="text"
            required
            maxLength={80}
            placeholder="e.g. Christmas, Birthday"
            value={form.occasion}
            onChange={(e) => update({ occasion: e.target.value })}
            onBlur={() => blur("occasion")}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 aria-invalid:border-red-500"
            aria-invalid={!!showError("occasion")}
            aria-describedby={showError("occasion") ? "gift-occasion-error" : undefined}
          />
          {showError("occasion") && (
            <p id="gift-occasion-error" className="mt-1 text-sm text-red-600">
              {errors.occasion}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="gift-due-date" className="block text-sm font-medium text-gray-700 mb-1">
            Due Date <span className="text-red-600">*</span>
          </label>
          <input
            id="gift-due-date"
            type="date"
            required
            value={form.dueDate}
            onChange={(e) => update({ dueDate: e.target.value })}
            onBlur={() => blur("dueDate")}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 aria-invalid:border-red-500"
            aria-invalid={!!showError("dueDate")}
            aria-describedby={showError("dueDate") ? "gift-due-date-error" : undefined}
          />
          {showError("dueDate") && (
            <p id="gift-due-date-error" className="mt-1 text-sm text-red-600">
              {errors.dueDate}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="gift-budget" className="block text-sm font-medium text-gray-700 mb-1">
            Budget (optional)
          </label>
          <input
            id="gift-budget"
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={form.budget === "" ? "" : form.budget}
            onChange={(e) => {
              const v = e.target.value;
              update({
                budget: v === "" ? "" : parseFloat(v) || 0,
              });
            }}
            onBlur={() => blur("budget")}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 aria-invalid:border-red-500"
            aria-invalid={!!showError("budget")}
            aria-describedby={showError("budget") ? "gift-budget-error" : undefined}
          />
          {showError("budget") && (
            <p id="gift-budget-error" className="mt-1 text-sm text-red-600">
              {errors.budget}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="gift-store-link" className="block text-sm font-medium text-gray-700 mb-1">
            Store Link
          </label>
          <input
            id="gift-store-link"
            type="url"
            maxLength={STORE_LINK_MAX}
            placeholder="https://..."
            value={form.storeLink}
            onChange={(e) => update({ storeLink: e.target.value })}
            onBlur={() => blur("storeLink")}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 aria-invalid:border-red-500"
            aria-invalid={!!showError("storeLink")}
          />
          {showError("storeLink") && (
            <p className="mt-1 text-sm text-red-600">{errors.storeLink}</p>
          )}
        </div>

        <div>
          <label htmlFor="gift-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description &amp; Link
          </label>
          <textarea
            id="gift-description"
            rows={3}
            maxLength={DESCRIPTION_MAX}
            placeholder="Add a link or note for your Santa..."
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            onBlur={() => blur("description")}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-y aria-invalid:border-red-500"
            aria-invalid={!!showError("description")}
          />
          <p className="mt-0.5 text-xs text-gray-500">
            {form.description.length}/{DESCRIPTION_MAX}
          </p>
          {showError("description") && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Gift Photo
          </span>
          <div
            role="group"
            aria-label="Upload gift image"
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-300 focus-within:ring-2 focus-within:ring-red-400 transition-colors"
          >
            {form.imageDataUrl ? (
              <div className="relative inline-block">
                <img
                  src={form.imageDataUrl}
                  alt="Gift preview"
                  className="max-h-32 rounded object-cover"
                />
                <button
                  type="button"
                  onClick={() => update({ imageDataUrl: null })}
                  className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 hover:bg-gray-700"
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload className="mx-auto text-gray-400 mb-2" size={28} aria-hidden />
                <p className="text-sm text-gray-600 mb-2">
                  Tap to add a photo of the gift
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                  id="gift-image-upload"
                />
                <label
                  htmlFor="gift-image-upload"
                  className="inline-block cursor-pointer text-red-600 hover:text-red-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-3 py-1"
                >
                  Choose File
                </label>
              </>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="gift-privacy" className="block text-sm font-medium text-gray-700 mb-1">
            Privacy
          </label>
          <select
            id="gift-privacy"
            value={form.privacy}
            onChange={(e) => update({ privacy: e.target.value as GiftPrivacy })}
            onBlur={() => blur("privacy")}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 bg-white"
            aria-describedby={showError("privacy") ? "gift-privacy-error" : undefined}
          >
            {PRIVACY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {showError("privacy") && (
            <p id="gift-privacy-error" className="mt-1 text-sm text-red-600">
              {errors.privacy}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!valid || loading}
          className="w-full py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition-colors"
        >
          {loading ? (
            <span className="animate-pulse">Saving...</span>
          ) : (
            <>
              <Plus size={20} aria-hidden />
              {submitLabel}
            </>
          )}
        </button>
      </form>
    </section>
  );
};
