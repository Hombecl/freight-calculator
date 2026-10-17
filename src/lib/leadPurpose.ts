// Fixed categories only: no shipment details or free-form text in the export gate.
export const LEAD_PURPOSES = [
  ['container-loading', 'Load a container or truck'],
  ['pallet-planning', 'Plan pallets or check pallet height'],
  ['freight-quote', 'Prepare a freight quote'],
  ['packing-instructions', 'Share packing instructions'],
  ['exploring', 'Explore or learn'],
  ['other', 'Another task'],
] as const;
export type LeadPurpose = typeof LEAD_PURPOSES[number][0];
export const validLeadPurpose = (value: unknown): LeadPurpose | undefined =>
  LEAD_PURPOSES.some(([key]) => key === value) ? value as LeadPurpose : undefined;
