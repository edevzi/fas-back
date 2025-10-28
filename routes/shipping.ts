import { RequestHandler } from "express";

const BASE_FEES: Record<string, { courier_door: number; pickup: number }> = {
  "UZ-TCC": { courier_door: 15000, pickup: 0 },
  "UZ-TOS": { courier_door: 18000, pickup: 0 },
  "UZ-SAM": { courier_door: 18000, pickup: 0 },
  DEFAULT: { courier_door: 22000, pickup: 0 },
};

export const getQuote: RequestHandler = (req, res) => {
  const region = (req.query.region as string) || "DEFAULT";
  const method = (req.query.method as string) || "courier_door";
  const weight = parseFloat((req.query.weight as string) || "0");

  const base = BASE_FEES[region]?.[method as "courier_door" | "pickup"] ?? BASE_FEES.DEFAULT.courier_door;
  const fee = Math.round(base + Math.max(0, weight) * 2000);
  const etaDays = method === "pickup" ? 1 : region === "UZ-TCC" ? 1 : 2;

  res.json({ fee, etaDays });
};