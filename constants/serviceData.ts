export interface RoadsideService {
  id: string;
  name: string;
  basePrice: number;
  afterHoursPrice: number;
  travelFee: number;
}

export const roadsideServices: RoadsideService[] = [
  {
    id: "lockout_standard",
    name: "Lockout (Standard)",
    basePrice: 76.95,
    afterHoursPrice: 107.73,
    travelFee: 25,
  },
  {
    id: "tire_change",
    name: "Tire Change (Roadside)",
    basePrice: 64.13,
    afterHoursPrice: 89.78,
    travelFee: 25,
  },
  {
    id: "battery_replacement",
    name: "12-Volt Battery Replacement",
    basePrice: 213.75,
    afterHoursPrice: 299.25,
    travelFee: 25,
  },
  {
    id: "jump_start",
    name: "Jump-Start (12V)",
    basePrice: 64.13,
    afterHoursPrice: 89.78,
    travelFee: 25,
  },
  {
    id: "ev_emergency_charge",
    name: "EV Emergency Charge (Level 2, 24 amps, gas generator, 1 hour minimum, 30-40 miles range)",
    basePrice: 102.60,
    afterHoursPrice: 143.64,
    travelFee: 25,
  },
  {
    id: "ev_emergency_charge_premium",
    name: "EV Emergency Charge (Level 2, 45-50 amps max, gas generator, 1 hour minimum, 30-40 miles range)",
    basePrice: 150.00,
    afterHoursPrice: 210.00,
    travelFee: 25,
  },
  {
    id: "tire_plug_patch",
    name: "Tire Plug / Patch",
    basePrice: 42.75,
    afterHoursPrice: 59.85,
    travelFee: 25,
  },
  {
    id: "tesla_lockout",
    name: "Tesla Exclusive Lockout (12V battery dead)",
    basePrice: 150.00,
    afterHoursPrice: 210.00,
    travelFee: 25,
  },
  {
    id: "generator_charging",
    name: "Charging via Generator (5 hour minimum)",
    basePrice: 200.00,
    afterHoursPrice: 200.00,
    travelFee: 0,
  },
];

export function isAfterHours(date?: Date): boolean {
  const checkDate = date || new Date();
  const hour = checkDate.getHours();
  return hour >= 18 || hour < 11;
}

export function calculateServicePrice(service: RoadsideService, date?: Date): number {
  const price = isAfterHours(date) ? service.afterHoursPrice : service.basePrice;
  return price + service.travelFee;
}

export const serviceTypes = [
  {
    id: "roadside" as const,
    title: "Roadside Assistance",
    description: "Emergency help when you need it",
    icon: "truck",
    color: "#DC2626",
  },
  {
    id: "charging" as const,
    title: "Scheduled Charging",
    description: "Plan your charging session",
    icon: "battery-charging",
    color: "#EF4444",
  },
];
