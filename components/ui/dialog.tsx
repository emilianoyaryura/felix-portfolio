"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-gray-500/50 backdrop-blur-[1px] data-[state=closed]:animate-custom-hide data-[state=open]:animate-custom-show" />
      <div className="fixed inset-0 z-50 px-4 flex justify-center items-center pointer-events-none">
        <DialogPrimitive.Content
          className={cn(
            "pointer-events-auto z-50 w-full rounded-xl relative border border-solid border-gray-300 bg-white p-4 sm:p-5 data-[state=open]:animate-custom-animate-in data-[state=closed]:animate-[custom-animate-out_150ms_ease-in] sm:max-w-lg smooth-shadow-sm max-h-[90vh] overflow-y-auto",
            className
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col pb-3 sm:pb-4 border-b border-gray-200",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base md:text-lg font-medium", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-gray-500 leading-[1.4] mt-1", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-x-2",
        className
      )}
      {...props}
    />
  );
}

function DialogCloseButton() {
  return (
    <DialogPrimitive.Close className="absolute right-4 top-4 p-1 rounded-md hover:bg-gray-100 text-gray-500">
      <X className="w-4 h-4" />
    </DialogPrimitive.Close>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogCloseButton,
};
