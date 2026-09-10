// Templates inherited from the DIM calculator; verify divisor with your carrier/buyer.
export const DIM_PRESETS = [
    { key: 'amazon', label: 'Amazon US FBA', system: 'imperial', divisor: 139, template: true, note: 'lb · ÷139 (in³/lb)' },
    { key: 'express', label: 'UPS / FedEx / DHL — international express', system: 'metric', divisor: 5000, template: true, note: 'kg · ÷5000 (cm³/kg)' },
    { key: 'courier-us', label: 'UPS / FedEx — US domestic', system: 'imperial', divisor: 139, template: true, note: 'lb · ÷139 (in³/lb)' },
    { key: 'air', label: 'Air freight (IATA volumetric)', system: 'metric', divisor: 6000, template: true, note: 'kg · ÷6000 (cm³/kg)' },
] as const;
