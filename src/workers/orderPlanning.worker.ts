import { planOrder, compareOrders } from "../lib/orderPlanning";
self.onmessage = ({ data }) => {
  try {
    const result =
      data.action === "compare"
        ? compareOrders(data.input)
        : planOrder(data.input);
    self.postMessage({ id: data.id, action: data.action, result });
  } catch (error) {
    self.postMessage({
      id: data.id,
      action: data.action,
      error: error instanceof Error ? error.message : "invalid",
    });
  }
};
