"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({
  label,
  name,
  required = false,
  defaultValue,
  placeholder,
  autoComplete = "current-password",
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className="password-input-wrap">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={128}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="none"
        />
        <button
          className="password-visibility"
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={id}
          title={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff size={19} aria-hidden="true" />
          ) : (
            <Eye size={19} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
