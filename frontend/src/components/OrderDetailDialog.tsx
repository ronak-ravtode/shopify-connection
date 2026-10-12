import React, { useEffect, useState } from "react";
import { Button, Card, Badge } from "./primitives";
import ProductAvatar from "./ProductAvatar";
import { pushStateLabel, type OrderShipment } from "../lib/shipments";
import { calculateAllCourierCharges, type CourierCode } from "../lib/india-post";
import { downloadInvoicePdf } from "../lib/api";
import { CarrierIcon } from "./CarrierIcon";
import {
  IconClose,
  IconDownload,
  IconMessage,
  IconPhone,
  IconPlus,
  IconSpark,
  IconTruck,
} from "./icons";
import WhatsAppDialog from "./WhatsAppDialog";


const FINANCIAL_DOTS: Record<string, string> = {
  PAID: "bg-emerald-500",
  PENDING: "bg-amber-500",
  REFUNDED: "bg-rose-500",
};

export default function OrderDetailDialog({
  open,
  order,
  onClose,
  onEditOrder,
  onAddShipment,
}: {
  open: boolean;
  order: any | null;
  onClose: () => void;
  onEditOrder?: (order: any) => void;
  onAddShipment?: (order: any, courierCode?: string) => void;
}) {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<CourierCode>("INDIA_POST");

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !order) return null;

  const items = Array.isArray(order.items) ? order.items : [];
  const shipment: OrderShipment | null = order.shipment || null;
  const orderName = order.shopify_order_name || order.internal_order_number || order.id;

  const multiEst = calculateAllCourierCharges({
    weight_grams: order.weight_grams,
    length_cm: order.length_cm,
    breadth_cm: order.breadth_cm,
    height_cm: order.height_cm,
    cod_mode: order.cod_mode,
    cod_value: order.cod_value,
    total_amount: order.total_amount,
    receiver_pincode: order.receiver_pincode || order.shipping_pincode || order.pincode,
  });

  const currentEst = multiEst.estimates[selectedCourier];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 sm:px-6 py-3 sm:py-4 bg-muted/30">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-mono text-base font-semibold text-foreground bg-primary/10 text-primary px-3 py-1 rounded-lg border border-primary/20">
              {orderName}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted border border-border/80 text-foreground">
                <span className={`size-2 rounded-full ${FINANCIAL_DOTS[order.financial_status?.toUpperCase()] ?? "bg-gray-400"}`} />
                {order.financial_status || "PENDING"}
              </span>
              {order.cod_mode && (() => {
                const isCod = String(order.cod_mode).toUpperCase() === "COD";
                if (!isCod) {
                  return <Badge variant="secondary">PREPAID</Badge>;
                }
                const total = Number(order.total_amount || 0);
                const collectable = total > 0 ? Math.max(0, total - 300) + 50 : Number(order.cod_value || 0);
                return (
                  <Badge variant="destructive" className="bg-amber-600 text-white gap-1.5 font-mono text-xs">
                    <span>COD Collectable: ₹{collectable.toLocaleString()}</span>
                    <span className="opacity-90 font-normal text-[10px]">(₹300 Adv Paid)</span>
                  </Badge>
                );
              })()}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close dialog"
          >
            <IconClose size={14} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
          {/* Customer Details */}
          <Card className="p-4 border-border/80 bg-muted/20">
            <h3 className="text-xs font-semibold font-heading uppercase tracking-wider text-muted-foreground mb-3">
              Customer Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Customer Name</span>
                <span className="font-semibold text-foreground">{order.receiver_name || "N/A"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Mobile / Phone</span>
                <span className="font-mono font-medium text-foreground flex items-center gap-1.5">
                  {order.receiver_mobile ? (
                    <>
                      <IconPhone size={13} className="text-muted-foreground" />
                      <span>{order.receiver_mobile}</span>
                    </>
                  ) : (
                    "N/A"
                  )}
                </span>
              </div>
              {order.receiver_email && (
                <div>
                  <span className="text-xs text-muted-foreground block">Email</span>
                  <span className="text-foreground">{order.receiver_email}</span>
                </div>
              )}
              <div className="sm:col-span-2">
                <span className="text-xs text-muted-foreground block">Shipping Address</span>
                <span className="text-foreground font-medium">
                  {[order.receiver_add1, order.receiver_city, order.receiver_state, order.receiver_pincode]
                    .filter(Boolean)
                    .join(", ") || "N/A"}
                </span>
              </div>
            </div>
          </Card>

          {/* Shopify Ordered Products (With Product Images) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold font-heading uppercase tracking-wider text-muted-foreground">
                Ordered Items ({items.length})
              </h3>
              <span className="text-xs text-muted-foreground">Items synced from Shopify</span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No items attached to this order.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it: any, idx: number) => (
                  <div
                    key={it.id || idx}
                    className="flex items-center gap-4 rounded-xl border border-border/80 bg-card p-3 shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    {/* Product Image */}
                    <ProductAvatar
                      imageUrl={it.image_url}
                      title={it.title}
                      className="size-16 rounded-xl border border-border/60 object-cover bg-muted shrink-0 shadow-xs"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate" title={it.title}>
                        {it.title || "Unnamed Product"}
                      </h4>
                      {it.sku && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          SKU: {it.sku}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>Qty: <strong className="text-foreground font-mono">{it.quantity || 1}</strong></span>
                        <span>•</span>
                        <span>Price: <strong className="text-foreground tabular-nums">₹{Number(it.price || 0).toLocaleString()}</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold text-foreground tabular-nums block">
                        ₹{(Number(it.price || 0) * Number(it.quantity || 1)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Multi-Courier Shipping Charges & Parcel Dimensions */}
          <Card className="p-4 border-primary/30 bg-muted/20 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <IconTruck size={16} className="text-primary" />
                <h3 className="text-xs font-semibold font-heading uppercase tracking-wider text-foreground">
                  Estimated Courier Shipping Charges
                </h3>
              </div>
              <Badge variant="secondary" className="bg-emerald-600 text-white font-mono text-xs font-semibold px-2.5 py-0.5 flex items-center gap-1">
                <IconSpark size={12} />
                <span>Best Rate: {multiEst.cheapestCourier.badgeText} (₹{multiEst.cheapestCourier.totalCharge.toFixed(2)})</span>
              </Badge>
            </div>

            {/* Courier Tabs Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {(Object.keys(multiEst.estimates) as CourierCode[]).map((code) => {
                const est = multiEst.estimates[code];
                const isSelected = selectedCourier === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedCourier(code)}
                    className={`relative flex flex-col items-start p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                        : "border-border/80 bg-background/80 hover:bg-muted/50"
                    }`}
                  >
                    {est.isCheapest && (
                      <span className="absolute -top-2 right-2 text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500 text-white shadow-2xs">
                        Lowest
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 mb-1">
                      <CarrierIcon code={est.code} size={15} />
                      <span className="text-xs font-semibold font-heading text-foreground truncate">
                        {est.badgeText}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-primary">
                      ₹{est.totalCharge.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Parcel Weight & Dimension Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3 pb-3 border-b border-border/60">
              <div className="bg-background/80 p-2 rounded-lg border border-border/60">
                <span className="text-[11px] text-muted-foreground block">Actual Weight</span>
                <span className="font-mono font-semibold text-foreground">{currentEst.actualWeightGrams} g</span>
              </div>
              <div className="bg-background/80 p-2 rounded-lg border border-border/60">
                <span className="text-[11px] text-muted-foreground block">Dimensions (L×W×H)</span>
                <span className="font-mono font-semibold text-foreground">
                  {currentEst.lengthCm}×{currentEst.breadthCm}×{currentEst.heightCm} cm
                </span>
              </div>
              <div className="bg-background/80 p-2 rounded-lg border border-border/60">
                <span className="text-[11px] text-muted-foreground block">Volumetric Weight</span>
                <span className="font-mono font-semibold text-foreground">{currentEst.volumetricWeightGrams} g</span>
              </div>
              <div className="bg-background/80 p-2 rounded-lg border border-primary/40 bg-primary/5">
                <span className="text-[11px] text-primary font-semibold block">Billable Weight</span>
                <span className="font-mono font-semibold text-primary">{currentEst.billableWeightGrams} g</span>
              </div>
            </div>

            {/* Itemized Cost Breakdown for Selected Courier */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between items-center font-medium text-foreground pb-1">
                <span className="flex items-center gap-1.5 font-semibold">
                  <CarrierIcon code={currentEst.code} size={15} />
                  <span>{currentEst.name}</span>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted border border-border">
                  Zone: {currentEst.zoneLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Base Postage / Freight ({currentEst.billableWeightGrams}g slab)</span>
                <span className="font-mono font-medium text-foreground">₹{currentEst.basePostage.toFixed(2)}</span>
              </div>
              {currentEst.docketFee > 0 && (
                <div className="flex justify-between">
                  <span>Docket / Handling Fee</span>
                  <span className="font-mono font-medium text-foreground">₹{currentEst.docketFee.toFixed(2)}</span>
                </div>
              )}
              {currentEst.fuelSurcharge > 0 && (
                <div className="flex justify-between">
                  <span>Fuel Surcharge</span>
                  <span className="font-mono font-medium text-foreground">₹{currentEst.fuelSurcharge.toFixed(2)}</span>
                </div>
              )}
              {currentEst.codFee > 0 && (
                <div className="flex justify-between">
                  <span>COD Collection Fee</span>
                  <span className="font-mono font-medium text-foreground">₹{currentEst.codFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST (18% Tax)</span>
                <span className="font-mono font-medium text-foreground">₹{currentEst.gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground pt-2 border-t border-border">
                <span>Estimated {currentEst.badgeText} Delivery Charge</span>
                <span className="font-mono text-primary text-sm font-semibold">
                  ₹{currentEst.totalCharge.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>

          {/* Shipment Info */}
          <Card className="p-4 border-border/80 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold font-heading uppercase tracking-wider text-muted-foreground">
                Shipment Information
              </h3>
              {shipment && (
                <span className="text-xs font-medium text-amber-600">
                  {pushStateLabel(shipment.push_state || "none")}
                </span>
              )}
            </div>

            {shipment ? (
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">AWB / Tracking Number</span>
                  <span className="font-mono font-semibold text-primary">{shipment.awb_number || "Awaiting Allocation"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Carrier / Delivery Partner</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <CarrierIcon code={currentEst.code} size={15} />
                    <span>{currentEst.name}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">No shipment created yet</span>
                {onAddShipment && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onAddShipment(order);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 gap-1.5 cursor-pointer"
                  >
                    <IconPlus size={14} />
                    Add Shipment
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Payment Breakdown / Total Summary */}
          {(() => {
            const isCod = order.cod_mode
              ? String(order.cod_mode).toUpperCase() === "COD"
              : Number(order.cod_value || 0) > 0;
            const total = Number(order.total_amount || 0);

            if (isCod) {
              const prepaidAdvance = total >= 300 ? 300 : total;
              const remainingBalance = Math.max(0, total - prepaidAdvance);
              const codHandlingFee = total > 0 ? 50 : 0;
              const codCollectable = total > 0 ? remainingBalance + codHandlingFee : Number(order.cod_value || 0);

              return (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border/70">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Payment Breakdown
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      Cash on Delivery (COD)
                    </span>
                  </div>

                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Prepaid Amount (Advance Paid Online)</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ₹{prepaidAdvance.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Remaining Order Balance</span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        ₹{remainingBalance.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>COD Courier Handling Fee</span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        +₹{codHandlingFee.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20 text-xs sm:text-sm">
                      <span>Remaining COD (To Collect on Delivery)</span>
                      <span className="font-mono font-semibold text-sm sm:text-base tabular-nums">
                        ₹{codCollectable.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">Total Order Amount</span>
                    <span className="text-lg font-semibold font-mono text-foreground tabular-nums">
                      ₹{total.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/70">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Payment Breakdown
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    Prepaid Order
                  </span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Prepaid Amount (Paid Online)</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ₹{total.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Remaining COD to Collect</span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      ₹0
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">Total Order Amount</span>
                  <span className="text-lg font-semibold font-mono text-foreground tabular-nums">
                    ₹{total.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 sm:px-6 py-3.5 bg-muted/30 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void downloadInvoicePdf(order.id, `GST_Tax_Invoice_${(order.shopify_order_name || order.internal_order_number || order.id).replace('#', '')}.pdf`)}
              className="text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-semibold text-xs shadow-xs gap-1.5 cursor-pointer"
            >
              <IconDownload size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>GST Invoice (PDF)</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowWhatsApp(true)}
              className="text-[#25D366] border-emerald-500/30 hover:bg-emerald-500/10 font-semibold text-xs shadow-xs gap-1.5 cursor-pointer"
            >
              <IconMessage size={14} className="text-[#25D366]" />
              <span>WhatsApp Alert</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onEditOrder && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEditOrder(order);
                }}
                className="cursor-pointer"
              >
                Edit Order
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>

        <WhatsAppDialog
          open={showWhatsApp}
          order={order}
          onClose={() => setShowWhatsApp(false)}
        />
      </div>
    </div>
  );
}
