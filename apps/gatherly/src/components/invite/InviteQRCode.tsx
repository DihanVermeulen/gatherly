import React from 'react';
import { QRCodeSVG } from 'react-qr-code';

interface InviteQRCodeProps {
  inviteUrl: string;
  size?: number;
}

export const InviteQRCode = React.memo<InviteQRCodeProps>(({ inviteUrl, size = 256 }) => {
  return (
    <div className="bg-white p-4 rounded-lg inline-block">
      <QRCodeSVG
        value={inviteUrl}
        size={size}
        level="M"
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        viewBox={`0 0 ${size} ${size}`}
      />
    </div>
  );
});

InviteQRCode.displayName = 'InviteQRCode';
