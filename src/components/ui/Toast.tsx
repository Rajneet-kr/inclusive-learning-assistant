import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";

export const ToastProvider = ToastPrimitives.Provider;
export const ToastViewport = ToastPrimitives.Viewport;
export const Toast = ToastPrimitives.Root;
export const ToastTitle = ToastPrimitives.Title;
export const ToastDescription = ToastPrimitives.Description;
export const ToastClose = ToastPrimitives.Close;
export const ToastAction = ToastPrimitives.Action;

export function ToastBanner({
  title,
  description,
  variant = "info",
}: {
  title: string;
  description?: string;
  variant?: "info" | "success" | "warning";
}) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    success: "bg-green-50 border-green-200 text-green-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
  };

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border p-4 text-sm font-medium shadow-sm flex items-start gap-3",
        styles[variant]
      )}
    >
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-0.5 text-xs opacity-90">{description}</p>}
      </div>
    </div>
  );
}
