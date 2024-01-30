describe("Click all tabs in peer modal", () => {
  it("passes", () => {
    cy.visit("/install");
    cy.get("div").contains("Linux").click();
    cy.get("[data-cy=copy-to-clipboard]").click();
    cy.get("div").contains("Windows").click();
    cy.get("[data-cy=copy-to-clipboard]").click();
    cy.get("div").contains("Android").click();
    cy.get("[data-cy=copy-to-clipboard]").click();
    cy.get("div").contains("Docker").click();
    cy.get("[data-cy=copy-to-clipboard]").click();
  });
});
