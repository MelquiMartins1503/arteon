"use client";

import Image, { type ImageProps } from "next/image";
import * as React from "react";
import { cn } from "@/lib/cn";
import { Box } from "./Box";

const AvatarContext = React.createContext<{
  status: "loading" | "error" | "loaded";
  setStatus: (status: "loading" | "error" | "loaded") => void;
} | null>(null);

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const [status, setStatus] = React.useState<"loading" | "error" | "loaded">(
    "loading",
  );

  const contextValue = React.useMemo(() => ({ status, setStatus }), [status]);

  return (
    <AvatarContext.Provider value={contextValue}>
      <div
        ref={ref}
        className={cn(
          "flex overflow-hidden relative w-10 h-10 rounded-full shrink-0",
          className,
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
});
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    "src" | "width" | "height"
  > & {
    src?: ImageProps["src"];
  }
>(({ className, src, alt, ...props }, ref) => {
  const context = React.useContext(AvatarContext);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  // If src changes, reset status to loading
  React.useEffect(() => {
    if (!src) {
      context?.setStatus("error");
    } else {
      context?.setStatus("loading");
      setHasLoaded(false);
    }
  }, [src, context]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasLoaded(true);
    context?.setStatus("loaded");
    props.onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    context?.setStatus("error");
    props.onError?.(e);
  };

  if (!src) return null;

  return (
    <Image
      ref={ref}
      src={src}
      alt={alt || "Avatar"}
      fill
      sizes="40px"
      onLoad={handleLoad}
      onError={handleError}
      className={cn("object-cover w-full h-full aspect-square", className)}
      style={{ display: hasLoaded ? "block" : "none" }}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const context = React.useContext(AvatarContext);

  if (context?.status === "loaded") {
    return null;
  }

  return (
    <Box
      ref={ref}
      justifyContent="center"
      alignItems="center"
      className={cn(
        "w-full h-full rounded-full bg-neutral-100 dark:bg-neutral-800",
        className,
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
