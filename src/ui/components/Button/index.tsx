import { cn } from "@utils/cn";
import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  forwardRef,
} from "react";

type ButtonVariant = "danger" | "link" | "primary" | "quiet" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
};

function getButtonClass(variant: ButtonVariant) {
  if (variant === "primary") {
    return "ds-btn-primary";
  }
  if (variant === "danger") {
    return "ds-btn-danger";
  }
  if (variant === "quiet") {
    return "ds-btn-quiet";
  }
  if (variant === "link") {
    return "ds-link-button";
  }
  return "ds-btn-secondary";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    type = "button",
    variant = "secondary",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(getButtonClass(variant), className)}
      {...rest}
    />
  );
});

const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink(
    {
      children,
      className,
      variant = "secondary",
      ...rest
    },
    ref,
  ) {
    return (
      <a
        ref={ref}
        className={cn(getButtonClass(variant), className)}
        {...rest}
      >
        {children}
      </a>
    );
  },
);

export default Button;
export { ButtonLink };
export type { ButtonLinkProps, ButtonProps, ButtonVariant };
