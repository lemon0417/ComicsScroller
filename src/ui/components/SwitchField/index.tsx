import type { ReactNode } from "react";

type SwitchFieldProps = {
  checked: boolean;
  description: ReactNode;
  disabled?: boolean;
  id: string;
  label: ReactNode;
  onToggle: () => void;
};

function getFieldBaseId(id: string) {
  return id.endsWith("-toggle") ? id.slice(0, -"-toggle".length) : id;
}

export default function SwitchField({
  checked,
  description,
  disabled = false,
  id,
  label,
  onToggle,
}: SwitchFieldProps) {
  const fieldBaseId = getFieldBaseId(id);
  const labelId = `${fieldBaseId}-label`;
  const descriptionId = `${fieldBaseId}-desc`;

  return (
    <div className="manage-setting-row">
      <span className="flex min-w-0 flex-col gap-1">
        <span id={labelId} className="text-[14px] font-medium text-comic-ink">
          {label}
        </span>
        <span
          id={descriptionId}
          className="text-[12px] leading-5 text-comic-ink/60"
        >
          {description}
        </span>
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        disabled={disabled}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-comic-accent focus-visible:ring-offset-2 focus-visible:ring-offset-comic-paper ${
          checked
            ? "border-comic-accent bg-comic-accent"
            : "border-comic-line bg-comic-paper-soft"
        }`}
        onClick={onToggle}
      >
        <span
          className={`absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-comic-paper shadow-subtle transition-transform duration-150 ${
            checked ? "translate-x-[22px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

export type { SwitchFieldProps };
