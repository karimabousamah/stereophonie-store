"use client";

import { useFormStatus } from "react-dom";

type ConfirmSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  confirmation: string;
  className: string;
};

export default function ConfirmSubmitButton({
  label,
  pendingLabel,
  confirmation,
  className,
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmation)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
