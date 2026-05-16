import Button from "@components/Button";
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
        <Button variant="link" onClick={onDismiss}>
          關閉
        </Button>
      ) : null}
    </div>
  );
}
