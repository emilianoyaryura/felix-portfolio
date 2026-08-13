import * as React from "react";
import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("font-medium text-sm", className)} {...props} />;
}

export { Label };
