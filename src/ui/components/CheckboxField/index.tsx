import type { ChangeEventHandler, ReactNode } from "react";

type CheckboxFieldProps = {
  checked: boolean;
  description: ReactNode;
  descriptionId: string;
  disabled?: boolean;
  id: string;
  label: ReactNode;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export default function CheckboxField({
  checked,
  description,
  descriptionId,
  disabled = false,
  id,
  label,
  onChange,
}: CheckboxFieldProps) {
  return (
    <div className="ds-checkbox-row">
      <input
        id={id}
        type="checkbox"
        className="ds-checkbox"
        checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="ds-checkbox-copy">
        <label htmlFor={id} className="ds-checkbox-label">
          {label}
        </label>
        <span id={descriptionId} className="ds-checkbox-desc">
          {description}
        </span>
      </span>
    </div>
  );
}

export type { CheckboxFieldProps };
