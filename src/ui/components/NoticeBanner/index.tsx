import { cn } from "@utils/cn";

type NoticeBannerProps = {
  message: string;
  tone?: "success" | "error" | "info";
  onDismiss?: () => void;
};

export default function NoticeBanner({
  message,
  tone = "info",
  onDismiss,
}: NoticeBannerProps) {
  const role = tone === "error" ? "alert" : "status";
  const live = tone === "error" ? "assertive" : "polite";

  return (
    <div
      className={cn(
        "ds-notice",
        tone === "success"
          ? "ds-notice-success"
          : tone === "error"
            ? "ds-notice-error"
            : "ds-notice-info",
      )}
      role={role}
      aria-live={live}
    >
      <span>{message}</span>
      {onDismiss ? (
        <button type="button" className="ds-link-button" onClick={onDismiss}>
          關閉
        </button>
      ) : null}
    </div>
  );
}
