import Button, { ButtonLink } from "@components/Button";
import type { ExtensionReleaseNotice } from "@infra/services/extensionRelease";
import { cn } from "@utils/cn";
import { openExternalUrl } from "@utils/navigation";
import type { MouseEvent } from "react";

type ReleaseNoticeBannerDensity = "manage" | "popup";

type ReleaseNoticeBannerProps = {
  className?: string;
  density: ReleaseNoticeBannerDensity;
  notice: ExtensionReleaseNotice;
  onDismiss: (version: string) => void;
};

function openReleaseUrl(event: MouseEvent<HTMLAnchorElement>, url: string) {
  event.preventDefault();
  openExternalUrl(url);
}

export default function ReleaseNoticeBanner({
  className,
  density,
  notice,
  onDismiss,
}: ReleaseNoticeBannerProps) {
  const instructionsUrl = notice.instructionsUrl || notice.releaseUrl;

  if (density === "popup") {
    return (
      <div
        className={cn(
          "rounded-[14px] border border-comic-accent/15 bg-comic-paper/90 px-3 py-3 shadow-subtle",
          className,
        )}
      >
        <p className="text-[12px] font-medium leading-5 text-comic-ink">
          Comics Scroller {notice.latestVersion} 已發布，請手動更新擴充套件。
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ButtonLink
            variant="secondary"
            href={instructionsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => openReleaseUrl(event, instructionsUrl)}
          >
            更新說明
          </ButtonLink>
          <Button variant="link" onClick={() => onDismiss(notice.latestVersion)}>
            稍後
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-comic-accent/15 bg-comic-paper px-4 py-3 shadow-subtle",
        className,
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-comic-ink">
            Comics Scroller {notice.latestVersion} 已發布
          </p>
          <p className="mt-1 text-[12px] leading-5 text-comic-ink/60">
            目前需手動更新，請前往更新說明或 GitHub Release 重新安裝最新版。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink
            variant="secondary"
            href={instructionsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => openReleaseUrl(event, instructionsUrl)}
          >
            更新說明
          </ButtonLink>
          <ButtonLink
            variant="link"
            href={notice.releaseUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => openReleaseUrl(event, notice.releaseUrl)}
          >
            GitHub Release
          </ButtonLink>
          <Button variant="link" onClick={() => onDismiss(notice.latestVersion)}>
            稍後提醒
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { ReleaseNoticeBannerDensity, ReleaseNoticeBannerProps };
