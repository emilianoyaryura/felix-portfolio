"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Bottom sheet móvil sobre Radix Dialog, curva tipo iOS.
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetTitle = DialogPrimitive.Title;

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-gray-500/50 backdrop-blur-[1px] data-[state=closed]:animate-custom-hide data-[state=open]:animate-custom-show" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl max-h-[92vh] flex flex-col data-[state=open]:animate-[sheet-slide-up_350ms_cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:animate-[sheet-slide-down_250ms_cubic-bezier(0.32,0.72,0,1)]",
          className
        )}
        {...props}
      >
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky top-0 bg-white flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
        <X className="w-4 h-4" />
      </DialogPrimitive.Close>
    </div>
  );
}

function SheetBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto px-5 py-4", className)}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky bottom-0 bg-white px-5 pt-3 pb-safe border-t border-gray-100 shrink-0",
        className
      )}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetTitle,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
};
