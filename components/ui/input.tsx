import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  error?: boolean;
};

function Input({ className, error, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-9 text-base lg:text-sm leading-[1.15] w-full rounded-lg bg-gray-100 border py-1.5 px-3 text-gray-900 placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 outline-none focus:outline-none focus:border-gray-300 transition-all duration-300",
        error ? "border-red-200" : "border-gray-200",
        className
      )}
      {...props}
    />
  );
}

export { Input };
