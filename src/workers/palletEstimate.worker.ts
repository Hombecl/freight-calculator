import { estimatePallet } from "../lib/palletEstimate";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ id: data.id, result: estimatePallet(data.request) });
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : "Estimate failed",
    });
  }
};
