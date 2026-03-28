import React from "react";
import { Pressable, View } from "react-native";
import { X } from "lucide-react-native";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
} from "@/components/ui/modal";
import { PaywallBanner, PaywallFeature } from "@/components/PaywallBanner";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: PaywallFeature;
  eventId?: string;
  isParticipant: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaywallModal({
  isOpen,
  onClose,
  feature,
  eventId,
  isParticipant,
}: PaywallModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalBackdrop />
      <ModalContent style={{ flex: 1 }}>
        {/* Close button — absolute, top-right */}
        <View
          style={{
            position: "absolute",
            top: 48,
            right: 16,
            zIndex: 10,
          }}
        >
          <Pressable
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} color="#475569" />
          </Pressable>
        </View>

        {/* PaywallBanner centred vertically */}
        <View
          style={{
            flex: 1,
            justifyContent: "center",
          }}
        >
          <PaywallBanner
            feature={feature}
            eventId={eventId}
            isParticipant={isParticipant}
          />
        </View>
      </ModalContent>
    </Modal>
  );
}
