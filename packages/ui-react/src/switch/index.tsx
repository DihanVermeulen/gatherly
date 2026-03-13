"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    }

    return (
      <label
        className={cn(
          "group/switch inline-flex cursor-pointer items-center",
          "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
          className,
        )}
      >
        <input
          type="checkbox"
          role="switch"
          ref={ref}
          onChange={handleChange}
          className="sr-only"
          {...props}
        />
        {/* Track */}
        <span
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent",
            "bg-input transition-colors duration-200",
            "group-has-[input:checked]/switch:bg-primary",
            "group-has-[input:focus-visible]/switch:ring-2",
            "group-has-[input:focus-visible]/switch:ring-ring",
            "group-has-[input:focus-visible]/switch:ring-offset-2",
            "group-has-[input:focus-visible]/switch:ring-offset-background",
          )}
        >
          {/* Thumb */}
          <span
            className={cn(
              "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg",
              "transition-transform duration-200 translate-x-0",
              "group-has-[input:checked]/switch:translate-x-4",
            )}
          />
        </span>
      </label>
    );
  },
);

Switch.displayName = "Switch";
