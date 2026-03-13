import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function Avatar({ className, ...props }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
}

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: "loading" | "loaded" | "error") => void;
}

export function AvatarImage({ className, src, alt = "", onLoadingStatusChange, ...props }: AvatarImageProps) {
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">("loading");

  React.useEffect(() => {
    setStatus("loading");
  }, [src]);

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "aspect-square h-full w-full object-cover",
        status !== "loaded" && "hidden",
        className,
      )}
      onLoad={() => {
        setStatus("loaded");
        onLoadingStatusChange?.("loaded");
      }}
      onError={() => {
        setStatus("error");
        onLoadingStatusChange?.("error");
      }}
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
