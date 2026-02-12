import React from "react";
import QRCodeSVG from "react-qr-code";

interface InviteQRCodeProps {
  inviteUrl: string;
  size?: number;
}

export const InviteQRCode = React.memo<InviteQRCodeProps>(
  ({ inviteUrl, size = 256 }) => {
    // Handle undefined or empty URL
    if (!inviteUrl || inviteUrl.trim() === "") {
      return (
        <div
          className="bg-background p-4 rounded-lg inline-block items-center justify-center"
          style={{ width: size, height: size }}
        >
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
            Invalid invite URL
          </p>
        </div>
      );
    }

    return (
      <div className="bg-background p-4 rounded-lg inline-block">
        <QRCodeSVG
          value={inviteUrl}
          size={size}
          level="M"
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          viewBox={`0 0 ${size} ${size}`}
        />
      </div>
    );
  },
);

InviteQRCode.displayName = "InviteQRCode";
