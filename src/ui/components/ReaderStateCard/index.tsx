import { cn } from "@utils/cn";
import type { HTMLAttributes, ReactNode } from "react";

type ReaderStateCardProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
};

export default function ReaderStateCard({
  title,
  description,
  children,
  className,
  ...rest
}: ReaderStateCardProps) {
  return (
    <div className={cn("reader-paywall-card", className)} {...rest}>
      <p className="reader-paywall-title">{title}</p>
      {description ? (
        <div className="reader-paywall-desc">{description}</div>
      ) : null}
      {children}
    </div>
  );
}
