import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "active:scale-95 inline-flex items-center gap-2 border justify-center transition-colors focus:outline-none disabled:cursor-not-allowed font-medium",
  {
    variants: {
      variant: {
        default:
          "bg-primary !text-white md:hover:opacity-80 border-primary focus:ring-1 focus:ring-primary focus:ring-offset-1 disabled:opacity-80",
        destructive:
          "bg-red-500 border-red-500 text-white md:hover:bg-red-600 md:hover:border-red-600 focus:ring-1 focus:ring-red-600 focus:ring-offset-1 disabled:opacity-80",
        outline:
          "bg-transparent border-gray-400 hover:bg-gray-100 focus:ring-1 focus:ring-offset-1",
        subtle: "bg-gray-100 border-gray-200 md:hover:bg-gray-200",
        ghost:
          "bg-transparent border-transparent md:hover:border-gray-200 md:hover:bg-gray-100",
      },
      size: {
        default: "py-2 px-4 text-xs rounded-md h-[36px]",
        sm: "py-1.5 px-3 text-xs rounded-md h-[32px]",
        lg: "py-2 px-5 text-sm rounded-md h-10",
        icon: "w-9 h-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
