import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import OrderTable from "../src/components/OrderTable";
import OrdersPage from "../src/pages/Orders";

beforeEach(() => {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.releasePointerCapture = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ items: [] }),
  }) as unknown as Response));
});

test("renders order", () => {
  render(
    <MemoryRouter>
      <OrderTable orders={[{ id: "1", shopify_order_name: "#10452", total_amount: "1499.00" }]} />
    </MemoryRouter>
  );
  expect(screen.getByText("#10452")).toBeDefined();
});

test("clicking 3-dot action button opens dropdown menu", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <OrderTable
        orders={[{ id: "1", shopify_order_name: "#10452", total_amount: "1499.00" }]}
        onViewOrder={() => {}}
        onEditOrder={() => {}}
      />
    </MemoryRouter>
  );

  const actionBtn = screen.getByRole("button", { name: "Order actions" });
  expect(actionBtn).toBeDefined();

  await user.click(actionBtn);

  expect(await screen.findByText(/View Order Details/i)).toBeDefined();
  expect(await screen.findByText(/Download GST Invoice/i)).toBeDefined();
  expect(await screen.findByText(/Edit Order/i)).toBeDefined();
});

test("has new order + filters", async ()=>{
  render(<MemoryRouter><OrdersPage/></MemoryRouter>);
  expect(await screen.findByText(/New Order/i)).toBeDefined();
  expect(await screen.findByPlaceholderText(/Search orders/i)).toBeDefined();
});
