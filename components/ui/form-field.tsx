"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  htmlFor: string;
  label: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ htmlFor, label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      <FieldErrorText message={error} id={`${htmlFor}-error`} />
    </div>
  );
}

type FieldErrorTextProps = {
  id: string;
  message?: string;
  className?: string;
};

export function FieldErrorText({ id, message, className }: FieldErrorTextProps) {
  return (
    <p
      id={id}
      className={cn(
        "min-h-[1.25rem] text-xs leading-5",
        message ? "text-[var(--error-700)]" : "text-transparent",
        className
      )}
      aria-live="polite"
    >
      {message || " "}
    </p>
  );
}
