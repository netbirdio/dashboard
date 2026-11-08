import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Breadcrumbs, { BreadcrumbRootContext } from "@/components/Breadcrumbs";

afterEach(cleanup);

const Trail = () => (
  <Breadcrumbs>
    <Breadcrumbs.Item href={"/peers"} label={"Peers"} active />
  </Breadcrumbs>
);

describe("Breadcrumbs", () => {
  it("renders the page's trail as it is without a root", () => {
    render(<Trail />);
    const crumbs = screen.getAllByTestId("breadcrumb-item");
    expect(crumbs.map((c) => c.textContent)).toEqual(["Peers"]);
  });

  it("puts the layout's root, such as the product, in front of the trail", () => {
    render(
      <BreadcrumbRootContext.Provider
        value={{ label: "Agent Network", href: "/agent-network/providers" }}
      >
        <Trail />
      </BreadcrumbRootContext.Provider>,
    );
    const crumbs = screen.getAllByTestId("breadcrumb-item");
    expect(crumbs.map((c) => c.textContent)).toEqual([
      "Agent Network",
      "Peers",
    ]);
    expect(crumbs[0].getAttribute("href")).toBe("/agent-network/providers");
  });
});
