import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

interface LoadingButtonContentProps {
  loading: boolean;
  text: string;
  loadingText: string;
  icon?: ReactNode;
  size?: "compact" | "normal";
}

export default function LoadingButtonContent({
  loading,
  text,
  loadingText,
  icon,
  size = "normal",
}: LoadingButtonContentProps) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      {loading ? (
        <LoaderCircle
          aria-hidden="true"
          className={`${size === "compact" ? "h-4 w-4" : "h-5 w-5"} animate-spin motion-reduce:animate-none`}
        />
      ) : (
        icon
      )}
      <span>{loading ? loadingText : text}</span>
    </span>
  );
}
