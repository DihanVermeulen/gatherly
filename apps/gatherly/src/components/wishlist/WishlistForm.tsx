import { useEffect, useState } from 'react';
import { Gift, X, Upload, Camera, Link as LinkIcon } from 'lucide-react';
import { validateWishlistForm, WishlistFormErrors, isWishlistFormValid } from '../../core/wishlistValidation';
import { compressImage, compressImageFromUrl } from '../../core/imageCompression';
import type { WishlistItem } from '../../api/events';

export type WishlistFormData = {
  itemName: string;
  description: string;
  productUrl: string;
  priority: 'low' | 'medium' | 'high';
  imageUrl: string | null;
};

type WishlistFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: WishlistFormData) => void;
  editItem?: WishlistItem | null;
  isSaving?: boolean;
};

type UploadMode = 'camera' | 'gallery' | 'url' | null;

export function WishlistForm({ isOpen, onClose, onSave, editItem, isSaving = false }: WishlistFormProps) {
  const [formData, setFormData] = useState<WishlistFormData>({
    itemName: '',
    description: '',
    productUrl: '',
    priority: 'medium',
    imageUrl: null,
  });

  const [errors, setErrors] = useState<WishlistFormErrors>({});
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>(null);
  const [pasteUrl, setPasteUrl] = useState('');
  const [wasLargeImage, setWasLargeImage] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (isOpen && editItem) {
      setFormData({
        itemName: editItem.itemName,
        description: editItem.description || '',
        productUrl: editItem.productUrl || '',
        priority: editItem.priority,
        imageUrl: editItem.imageUrl || null,
      });
      setErrors({});
      setWasLargeImage(false);
    } else if (!isOpen) {
      // Reset form when closed
      setFormData({
        itemName: '',
        description: '',
        productUrl: '',
        priority: 'medium',
        imageUrl: null,
      });
      setErrors({});
      setUploadMode(null);
      setPasteUrl('');
      setWasLargeImage(false);
    }
  }, [isOpen, editItem]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setWasLargeImage(false);
    try {
      const result = await compressImage(file);
      setFormData(prev => ({ ...prev, imageUrl: result.base64 }));
      setWasLargeImage(result.wasLargeImage);
      setUploadMode(null);
    } catch (error) {
      setErrors(prev => ({ ...prev, image: 'Failed to upload image. Please try again.' }));
    } finally {
      setUploading(false);
    }
  };

  const handleImageUrlPaste = async () => {
    if (!pasteUrl.trim()) return;

    setUploading(true);
    setWasLargeImage(false);
    try {
      const result = await compressImageFromUrl(pasteUrl);
      setFormData(prev => ({ ...prev, imageUrl: result.base64 }));
      setWasLargeImage(result.wasLargeImage);
      setPasteUrl('');
      setUploadMode(null);
    } catch (error) {
      setErrors(prev => ({ ...prev, image: 'Failed to load image from URL. Please check the URL and try again.' }));
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleBlur = (field: keyof WishlistFormData) => {
    const validationErrors = validateWishlistForm({
      itemName: formData.itemName,
      description: formData.description,
      productUrl: formData.productUrl,
      priority: formData.priority,
    });

    if (validationErrors[field]) {
      setErrors(prev => ({ ...prev, [field]: validationErrors[field] }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateWishlistForm({
      itemName: formData.itemName,
      description: formData.description,
      productUrl: formData.productUrl,
      priority: formData.priority,
    });

    setErrors(validationErrors);

    if (isWishlistFormValid(validationErrors)) {
      onSave(formData);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: null }));
    setWasLargeImage(false);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.image;
      return newErrors;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1a2e20] rounded-t-2xl max-h-[90vh] overflow-y-auto transition-transform duration-300 ease-out">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {editItem ? 'Edit Item' : 'Add Wishlist Item'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-bold mb-3">Photo (optional)</label>

            {formData.imageUrl ? (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={formData.imageUrl}
                  alt="Item preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : uploading ? (
              <div className="w-full aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Uploading...</p>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-square rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center p-4">
                <Gift className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />

                {uploadMode === 'url' ? (
                  <div className="w-full space-y-2">
                    <input
                      type="text"
                      value={pasteUrl}
                      onChange={(e) => setPasteUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleImageUrlPaste}
                        className="flex-1 px-4 py-2 bg-primary text-[#0d1b12] rounded-lg text-sm font-bold"
                      >
                        Load Image
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMode(null);
                          setPasteUrl('');
                        }}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 w-full">
                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      <Camera className="w-4 h-4" />
                      <span className="text-sm font-bold">Take Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </label>

                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-bold">Choose from Gallery</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span className="text-sm font-bold">Paste Image URL</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {wasLargeImage && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                Large image compressed for storage
              </p>
            )}
            {errors.image && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">{errors.image}</p>
            )}
          </div>

          {/* Item Name */}
          <div>
            <label htmlFor="itemName" className="block text-sm font-bold mb-2">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              id="itemName"
              type="text"
              value={formData.itemName}
              onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
              onBlur={() => handleBlur('itemName')}
              placeholder="e.g., Blue Headphones"
              maxLength={120}
              className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.itemName && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.itemName}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">{formData.itemName.length}/120</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-bold mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              onBlur={() => handleBlur('description')}
              placeholder="Details about the item..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.description && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.description}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">{formData.description.length}/500</p>
            </div>
          </div>

          {/* Product URL */}
          <div>
            <label htmlFor="productUrl" className="block text-sm font-bold mb-2">
              Product URL (optional)
            </label>
            <input
              id="productUrl"
              type="url"
              value={formData.productUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, productUrl: e.target.value }))}
              onBlur={() => handleBlur('productUrl')}
              placeholder="https://..."
              maxLength={500}
              className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.productUrl && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.productUrl}</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-bold mb-2">
              Priority
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
              onBlur={() => handleBlur('priority')}
              className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            {errors.priority && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.priority}</p>
            )}
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSaving || uploading}
            className="w-full h-12 rounded-xl bg-primary text-[#0d1b12] font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {isSaving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Item'}
          </button>
        </form>
      </div>
    </>
  );
}
