import { dbWebhookEventsForOrganization } from "@/lib/data/repository";
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

export async function WebhookEventsTable({ organizationId }: { organizationId: string }) {
  const events = await dbWebhookEventsForOrganization(organizationId, 25);

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay eventos. Cuando el proveedor notifique al webhook, aparecerán aquí (útil con túnel en local).
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recibido</TableHead>
          <TableHead>Procesado</TableHead>
          <TableHead>Doc. remoto</TableHead>
          <TableHead>Estado parseado</TableHead>
          <TableHead>Parse</TableHead>
          <TableHead>Hash</TableHead>
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
            <TableCell className="text-xs">
              {e.documentDigidId != null ? e.documentDigidId : "—"}
            </TableCell>
            <TableCell className="max-w-[8rem] truncate text-xs text-muted-foreground" title={e.parsedStatus ?? ""}>
              {e.parsedStatus ?? "—"}
            </TableCell>
            <TableCell className="max-w-[10rem] text-xs">
              {e.parseError ? (
                <span className="text-destructive" title={e.parseError}>
                  {e.parseError.length > 48 ? `${e.parseError.slice(0, 48)}…` : e.parseError}
                </span>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="font-mono text-[10px] text-muted-foreground">
              {e.payloadHash ? (
                <span title={e.payloadHash}>{e.payloadHash.slice(0, 10)}…</span>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="max-w-[min(100%,24rem)]">
              <PayloadCell payload={e.payload} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
