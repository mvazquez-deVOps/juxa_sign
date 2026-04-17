import type { ReactNode } from "react";
import type { UserRole } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type InternalGuideCommentProps = {
  role: UserRole;
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

/** Callout visible solo para superadministrador (notas PM / equipo en guías embebidas). */
export function InternalGuideComment({
  role,
  title = "Nota interna (equipo)",
  description = "Visible solo para superadministrador.",
  className,
  children,
}: InternalGuideCommentProps) {
  if (role !== "SUPERADMIN") {
    return null;
  }

  return (
    <Card
      className={cn(
        "border-amber-500/35 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-950/25",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-950 dark:text-amber-100">{title}</CardTitle>
        <CardDescription className="text-amber-900/80 dark:text-amber-200/80">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm leading-relaxed text-amber-950/90 dark:text-amber-50/90">
        {children}
      </CardContent>
    </Card>
  );
}
