"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const } },
};

export function HomeHero({ showSandboxShortcuts = false }: { showSandboxShortcuts?: boolean }) {
  return (
    <motion.section
      className="rounded-2xl border border-border/80 bg-gradient-to-br from-primary/10 via-background to-[#2ABDA8]/10 p-8 shadow-sm dark:border-white/10 dark:from-[#1d4ed8]/15 dark:via-background dark:to-[#2ABDA8]/10 md:p-10"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
      }}
    >
      <motion.p
        variants={item}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2ABDA8] dark:text-[#5ee4d4]"
      >
        Juxa Sign
      </motion.p>
      <motion.h1
        variants={item}
        className="mt-2 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl"
      >
        Firma documentos de forma segura.
      </motion.h1>
      <motion.p variants={item} className="mt-4 max-w-xl text-muted-foreground">
        Registra clientes -empresa o persona física-, administra firmantes, sube PDFs, coloca marcas de
        firma y envía a firmar. Todo desde un sola sola plataforma.
      </motion.p>
      <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/empresas/nueva">
            Registrar cliente
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/documentos">Ver documentos</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/envios">Envíos y estado</Link>
        </Button>
        {showSandboxShortcuts ? (
          <Button variant="outline" asChild>
            <Link href="/prueba-e2e">Checklist sandbox (E2E)</Link>
          </Button>
        ) : null}
      </motion.div>
    </motion.section>
  );
}
