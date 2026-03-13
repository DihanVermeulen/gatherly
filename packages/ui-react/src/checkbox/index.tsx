"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    }

    return (
      <input
        type="checkbox"
        ref={ref}
        onChange={handleChange}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary",
          "shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "checked:bg-primary checked:text-primary-foreground checked:border-primary",
          "appearance-none cursor-pointer",
          // Custom checkmark via background-image when checked
          "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22white%22><path d=%22M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z%22/></svg>')] checked:bg-center checked:bg-no-repeat",
          className,
        )}
        {...props}
      />
    );
  },
);

Checkbox.displayName = "Checkbox";
