import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./primitives";
import { isAwaiting, pushStateLabel, statusTone, type OrderShipment } from "../lib/shipments";
import { IconEdit, IconMoreVertical, IconTrash } from "./icons";

const FINANCIAL_DOTS: Record<string, string> = {
  PAID: "var(--destructive)",
  PENDING: "var(--secondary-foreground)",
  REFUNDED: "var(--muted-foreground)",
};

function StatusBadge({ status, dotMap }: { status: string; dotMap: Record<string, string> }) {
  const dot = dotMap[status?.toUpperCase()] ?? "var(--muted-foreground)";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted/60 border border-border/80 text-foreground">
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: dot }}
      />
      {status}
    </span>
  );
}

function ShipmentCell({
  shipment,
  onAdd,
}: {
  shipment: OrderShipment | null | undefined;
  onAdd: () => void;
}) {
  if (!shipment) {
    return <span className="text-xs text-muted-foreground">{pushStateLabel("none")}</span>;
  }

  if (isAwaiting(shipment)) {
    return (
      <div className="flex flex-col items-start gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          size="sm"
          onClick={onAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
        >
          Add Shipment
        </Button>
        <span className="text-[11px] text-amber-600 font-medium">{pushStateLabel("awaiting")}</span>
      </div>
    );
  }

  if (shipment.push_state === "rejected") {
    return (
      <div className="flex flex-col items-start gap-1" onClick={(e) => e.stopPropagation()}>
        <span className="font-mono text-xs text-foreground font-medium">{shipment.awb_number}</span>
        <span className="text-[11px] text-destructive font-medium">{pushStateLabel("rejected")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1" onClick={(e) => e.stopPropagation()}>
      {shipment.id ? (
        <Link
          to={`/shipments/${shipment.id}`}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {shipment.awb_number}
        </Link>
      ) : (
        <span className="font-mono text-xs text-foreground font-medium">{shipment.awb_number}</span>
      )}
    </div>
  );
}

export default function OrderTable({
  orders,
  onAddShipment,
  onEditOrder,
  onDeleteOrder,
}: {
  orders: any[];
  onAddShipment?: (order: any) => void;
  onEditOrder?: (order: any) => void;
  onDeleteOrder?: (order: any) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-xl border border-border/80 bg-card p-12 text-center text-sm text-muted-foreground shadow-xs">
        No orders found. Click &quot;Sync Shopify Orders&quot; to import data.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order Name</TableHead>
          <TableHead>Shipment</TableHead>
          <TableHead>Financial Status</TableHead>
          <TableHead className="text-right">Total Amount</TableHead>
          <TableHead>COD</TableHead>
          <TableHead>City / Pincode</TableHead>
          <TableHead className="text-right">Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id} className="hover:bg-muted/40 transition-colors">
            <TableCell>
              <span className="font-mono text-xs font-semibold text-foreground bg-muted/40 px-2 py-1 rounded-md border border-border/70 inline-block">
                {o.shopify_order_name || o.internal_order_number || o.id}
              </span>
            </TableCell>
            <TableCell>
              <ShipmentCell shipment={o.shipment} onAdd={() => onAddShipment?.(o)} />
            </TableCell>
            <TableCell>
              <StatusBadge status={o.financial_status || "PENDING"} dotMap={FINANCIAL_DOTS} />
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums text-foreground">
              ₹{Number(o.total_amount || 0).toLocaleString()}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground tabular-nums">
              {(!o.cod_mode && (o.cod_value === undefined || o.cod_value === null || o.cod_value === ""))
                ? "-"
                : `${o.cod_mode ?? ""}${o.cod_mode && o.cod_value !== undefined && o.cod_value !== null && o.cod_value !== "" ? " " : ""}${o.cod_value !== undefined && o.cod_value !== null && o.cod_value !== "" ? `₹${o.cod_value}` : ""}`}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {`${o.receiver_city ?? ""} ${o.receiver_pincode ?? ""}`.trim() || "-"}
            </TableCell>
            <TableCell className="text-right text-xs text-muted-foreground font-mono">
              {(o.order_date ?? o.shopify_created_at ?? o.created_at)
                ? new Date(o.order_date ?? o.shopify_created_at ?? o.created_at).toLocaleString()
                : "-"}
            </TableCell>
            <TableCell className="text-right relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === o.id ? null : o.id);
                }}
                className="size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Order actions"
              >
                <IconMoreVertical size={16} />
              </Button>

              {openMenuId === o.id && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                    }}
                  />
                  <div
                    className="absolute right-0 top-10 z-50 min-w-[150px] rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100 text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        onEditOrder?.(o);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      <IconEdit size={14} className="text-primary" />
                      Edit Order
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        onDeleteOrder?.(o);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors mt-0.5"
                    >
                      <IconTrash size={14} />
                      Delete Order
                    </button>
                  </div>
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}