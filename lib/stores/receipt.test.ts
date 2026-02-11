import { act } from "react";

import { useReceiptStore } from "@/lib/stores/receipt";

describe("receipt store category mapping", () => {
  beforeEach(() => {
    useReceiptStore.getState().reset();
  });

  it("maps HSA fields to charitable when switching category", () => {
    act(() => {
      useReceiptStore.setState({
        category: "hsa",
        editedExpense: {
          provider: "Saint Thomas More",
          service_date: "2026-01-11",
          paid_date: "2026-01-11",
          amount: 500,
          hsa_eligible: false,
        },
      });
    });

    act(() => {
      useReceiptStore.getState().setCategory("charitable");
    });

    const state = useReceiptStore.getState();
    expect(state.category).toBe("charitable");
    expect(state.editedCharitableData?.organization_name).toBe("Saint Thomas More");
    expect(state.editedCharitableData?.donation_date).toBe("2026-01-11");
    expect(state.editedCharitableData?.amount).toBe(500);
  });

  it("maps charitable fields to HSA when switching category", () => {
    act(() => {
      useReceiptStore.setState({
        category: "charitable",
        editedCharitableData: {
          organization_name: "Red Cross",
          donation_date: "2026-02-01",
          amount: 75,
          tax_deductible: true,
          description: "Appeal",
        },
      });
    });

    act(() => {
      useReceiptStore.getState().setCategory("hsa");
    });

    const state = useReceiptStore.getState();
    expect(state.category).toBe("hsa");
    expect(state.editedExpense?.provider).toBe("Red Cross");
    expect(state.editedExpense?.service_date).toBe("2026-02-01");
    expect(state.editedExpense?.amount).toBe(75);
    expect(state.editedExpense?.hsa_eligible).toBe(true);
  });
});
