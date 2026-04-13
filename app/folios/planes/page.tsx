import Link from "next/link";
import { PotentialConsumerCallout } from "@/components/potential-consumer-callout";
import { requireOrgContext } from "@/lib/org-scope";
import { dbFolioPacksListActive } from "@/lib/data/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolioPlanesEconomicsSection } from "@/components/folio-planes-economics-section";

export const dynamic = "force-dynamic";

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function packPriceNumber(priceMxn: unknown): number {
  const raw =
    typeof priceMxn === "object" && priceMxn != null && "toString" in priceMxn
      ? (priceMxn as { toString: () => string }).toString()
      : String(priceMxn);
  return Number(raw);
}

export default async function FoliosPlanesPage() {
  const { role } = await requireOrgContext();
  const packs = await dbFolioPacksListActive();

  if (role === "SUPERADMIN") {
    const creditsInCatalog = packs.reduce((acc, p) => acc + p.folioAmount, 0);

    return (
      <div className="space-y-8">
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">Vista de plataforma</p>
          <p className="text-muted-foreground">
            Resumen del catálogo que ven las organizaciones. Para crear, editar o desactivar paquetes usa{" "}
            <Link href="/superadmin/folios" className="text-primary underline-offset-4 hover:underline">
              Folios en plataforma
            </Link>
            .
          </p>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catálogo de folios en venta</h1>
          <p className="text-sm text-muted-foreground">
            Paquetes activos y precio de venta al público (no es tu cartera personal).
          </p>
        </div>

        <FolioPlanesEconomicsSection />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Paquetes activos</CardTitle>
              <CardDescription>Líneas del catálogo visibles para compra</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{packs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Créditos en oferta</CardTitle>
              <CardDescription>Suma de créditos por paquete (todos los activos)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{creditsInCatalog.toLocaleString("es-MX")}</p>
            </CardContent>
          </Card>
        </div>

        {packs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay paquetes activos.{" "}
            <Link href="/superadmin/folios" className="text-primary underline-offset-4 hover:underline">
              Configurar en plataforma
            </Link>
          </p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Precios de venta por paquete</CardTitle>
              <CardDescription>Créditos incluidos y precio en pesos mexicanos</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paquete</TableHead>
                    <TableHead className="text-right tabular-nums">Créditos</TableHead>
                    <TableHead className="text-right tabular-nums">Precio venta</TableHead>
                    <TableHead className="text-right tabular-nums">Por crédito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packs.map((p) => {
                    const priceNum = packPriceNumber(p.priceMxn);
                    const perCredit = p.folioAmount > 0 ? priceNum / p.folioAmount : 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.folioAmount.toLocaleString("es-MX")}</TableCell>
                        <TableCell className="text-right tabular-nums">{mxn.format(priceNum)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {mxn.format(perCredit)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <p className="text-sm text-muted-foreground">
          <Link href="/folios" className="text-primary underline-offset-4 hover:underline">
            Ir a mi saldo de usuario
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PotentialConsumerCallout variant="planes" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planes</h1>
        <p className="text-sm text-muted-foreground">
          Conoce nuestros planes que tenemos para ti. 
        </p>
      </div>

      <FolioPlanesEconomicsSection />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay paquetes activos configurados.</p>
        ) : (
          packs.map((p) => {
            const price = packPriceNumber(p.priceMxn);
            return (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  {p.description ? <CardDescription>{p.description}</CardDescription> : null}
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-3xl font-bold tabular-nums">{mxn.format(price)}</p>
                  <p className="text-sm text-muted-foreground">{p.folioAmount} créditos de folio</p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" type="button" disabled variant="secondary">
                    Comprar (próximamente)
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href="/folios" className="text-primary underline-offset-4 hover:underline">
          Volver a mi saldo
        </Link>
      </p>
    </div>
  );
}
