import React from "react";
import { Link } from "react-router-dom";

const cols: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Executive Dashboard", href: "/dashboard" },
      { label: "Orders Directory", href: "/orders" },
      { label: "Create New Order", href: "/orders/new" },
      { label: "Exceptions & NDR", href: "/exceptions" },
      { label: "Tracking Telemetry", href: "/tracking" },
    ],
  },
  {
    title: "Operations",
    links: [
      { label: "COD Remittance", href: "/cod-remittance" },
      { label: "RTO Management", href: "/rto" },
      { label: "Shipments Tracking", href: "/shipments/tracking" },
      { label: "Parcels & Manifests", href: "/parcels" },
      { label: "Shipping Labels", href: "/parcels/labels" },
    ],
  },
  {
    title: "Finance",
    links: [
      { label: "Settlement Statements", href: "/statements" },
      { label: "Bank Reconciliation", href: "/statements#reconciliation" },
      { label: "General Ledger", href: "/finance/ledger" },
      { label: "Month-End Close", href: "/finance/close" },
      { label: "P&L / GST Reports", href: "/reports/monthly" },
    ],
  },
  {
    title: "Integrations",
    links: [
      { label: "Tally Prime ERP", href: "/settings/tally" },
      { label: "Carrier Adapters", href: "/settings/carriers" },
      { label: "SLA Thresholds", href: "/settings/sla" },
      { label: "Cost Configuration", href: "/settings/costs" },
      { label: "System Maintenance", href: "/maintenance" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/80 bg-card/30 backdrop-blur-sm pt-14 pb-10 text-foreground transition-colors">
      <div className="page-shell grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[2fr_repeat(4,1fr)]">
        {/* Brand Column */}
        <div className="flex flex-col gap-3.5">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-heading font-semibold text-xl tracking-tight text-foreground hover:opacity-90 transition-opacity"
          >
            <span className="size-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow-xs font-heading">
              R
            </span>
            <span>ReconHub</span>
          </Link>
          <p className="max-w-[300px] text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Autonomous operational ledger, physical barcode scan tracking, and idempotent Tally ERP reconciliation for high-volume Shopify brands.
          </p>
          <div className="mt-1 flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1 w-fit shadow-xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">
              Live Pipeline Active · Tally 2.0
            </span>
          </div>
        </div>

        {/* Link Columns */}
        {cols.map((c) => (
          <div key={c.title} className="flex flex-col gap-3">
            <h3 className="font-heading font-semibold text-xs tracking-wider uppercase text-foreground/90">
              {c.title}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {c.links.map((l) => (
                <li key={l.label + l.href}>
                  <Link
                    to={l.href}
                    className="block text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:translate-x-0.5 transform duration-150"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      <div className="page-shell mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border/80 pt-6 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span>© 2026 ReconHub. All rights reserved.</span>
          <span className="text-border">·</span>
          <span>Enterprise Financial Ledger</span>
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>Systems Normal</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 pr-10 sm:pr-0">
          <span className="rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            GST &amp; Tally Prime Compatible
          </span>
          <span className="rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Multi-Carrier Hub
          </span>
        </div>
      </div>
    </footer>
  );
}
