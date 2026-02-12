import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface InviteLinkProps {
  inviteUrl: string;
}

export const InviteLink: React.FC<InviteLinkProps> = ({ inviteUrl }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Modern Clipboard API (HTTPS only)
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for non-HTTPS environments
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-0 max-w-2xl">
      <input
        type="text"
        value={inviteUrl}
        readOnly
        className="rounded-l-lg px-3 py-2 flex-1 truncate border focus:outline-none"
      />
      <button
        onClick={handleCopy}
        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-r-lg flex items-center gap-2 transition-colors border border-emerald-600"
      >
        {copied ? (
          <>
            <Check size={18} />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy size={18} />
            <span>Copy Link</span>
          </>
        )}
      </button>
    </div>
  );
};
