import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const PREVIEW = 120;

function PayloadCell({ payload }: { payload: string }) {
  const preview = payload.length > PREVIEW ? `${payload.slice(0, PREVIEW)}…` : payload;
  const long = payload.length > PREVIEW || payload.includes("\n");
  return (
    <div className="space-y-2">
      <code className="break-all text-xs">{preview}</code>
      {long ? (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-destructive">Payload completo</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/60 p-2 font-mono">
            {payload}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

export async function WebhookEventsTable() {
  const events = await prisma.webhookEvent.findMany({
    orderBy: { receivedAt: "desc" },
    take: 25,
  });

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay eventos. Cuando DIGID llame al webhook, aparecerán aquí (útil con túnel en local).
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recibido</TableHead>
          <TableHead>Procesado</TableHead>
          <TableHead>Payload</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
              <time dateTime={e.receivedAt.toISOString()}>{e.receivedAt.toLocaleString()}</time>
            </TableCell>
            <TableCell>
              <Badge variant={e.processed ? "secondary" : "outline"}>
                {e.processed ? "Sí" : "No"}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[min(100%,32rem)]">
              <PayloadCell payload={e.payload} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
