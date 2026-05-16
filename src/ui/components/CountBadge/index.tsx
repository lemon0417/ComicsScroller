import { cn } from "@utils/cn";
import type { HTMLAttributes } from "react";

type CountBadgeProps = HTMLAttributes<HTMLSpanElement>;

export default function CountBadge({
  children,
  className,
  ...rest
}: CountBadgeProps) {
  return (
    <span className={cn("ds-count-badge", className)} {...rest}>
      {children}
    </span>
  );
}

export type { CountBadgeProps };
