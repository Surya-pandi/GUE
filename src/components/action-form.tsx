"use client";
import { useActionState } from "react";
export type ActionState = { error?: string; success?: string };
export type FormAction = (
  state: ActionState,
  data: FormData,
) => Promise<ActionState>;
export function ActionForm({
  action,
  children,
  submit = "Save changes",
  className = "",
  disabled = false,
  submitDisabled = false,
}: {
  action: FormAction;
  children?: React.ReactNode;
  submit?: string;
  className?: string;
  disabled?: boolean;
  submitDisabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={`action-form ${className}`}>
      <fieldset disabled={disabled || pending}>
        {children}
        <button className="button" type="submit" disabled={submitDisabled}>
          {pending ? "Please wait…" : submit}
        </button>
      </fieldset>
      <div aria-live="polite">
        {state.error && (
          <p className="alert error" role="alert">
            {state.error}
          </p>
        )}
        {state.success && <p className="alert success">{state.success}</p>}
      </div>
    </form>
  );
}
