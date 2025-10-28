import { RequestHandler } from "express";
import crypto from "crypto";
import { Order } from "../models/Order";

function idempotencyKey(id?: string) {
  return id || crypto.randomBytes(8).toString("hex");
}

export const createPayme: RequestHandler = async (req, res) => {
  const { orderId, amount } = req.body || {};
  if (!orderId || !amount) return res.status(400).json({ message: "orderId and amount required" });
  const intentId = idempotencyKey();
  await Order.findByIdAndUpdate(orderId, { "payment.method": "payme", "payment.status": "pending", "payment.intentId": intentId });
  const redirectUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/payment/success?orderId=${orderId}&intentId=${intentId}`;
  res.json({ intentId, redirectUrl });
};

export const createClick: RequestHandler = async (req, res) => {
  const { orderId, amount } = req.body || {};
  if (!orderId || !amount) return res.status(400).json({ message: "orderId and amount required" });
  const intentId = idempotencyKey();
  await Order.findByIdAndUpdate(orderId, { "payment.method": "click", "payment.status": "pending", "payment.intentId": intentId });
  const redirectUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/payment/success?orderId=${orderId}&intentId=${intentId}`;
  res.json({ intentId, redirectUrl });
};

function verifySignature(raw: string, signature?: string, secret?: string) {
  if (!signature || !secret) return false;
  const hmac = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export const paymeWebhook: RequestHandler = async (req, res) => {
  const signature = req.headers["x-signature"] as string | undefined;
  const raw = JSON.stringify(req.body || {});
  if (!verifySignature(raw, signature, process.env.PAYME_SECRET)) return res.status(401).json({ message: "invalid" });

  const { intentId, orderId, amount } = req.body || {};
  if (!intentId || !orderId) return res.status(400).json({ message: "invalid payload" });

  // TODO: validate amount with order totals
  await Order.findByIdAndUpdate(orderId, { status: "paid", "payment.status": "paid", "payment.paidAt": new Date() });
  res.json({ ok: true });
};

export const clickWebhook: RequestHandler = async (req, res) => {
  const signature = req.headers["x-signature"] as string | undefined;
  const raw = JSON.stringify(req.body || {});
  if (!verifySignature(raw, signature, process.env.CLICK_SECRET)) return res.status(401).json({ message: "invalid" });

  const { intentId, orderId, amount } = req.body || {};
  if (!intentId || !orderId) return res.status(400).json({ message: "invalid payload" });

  await Order.findByIdAndUpdate(orderId, { status: "paid", "payment.status": "paid", "payment.paidAt": new Date() });
  res.json({ ok: true });
};

export const returnSuccess: RequestHandler = (_req, res) => {
  res.send("Payment success");
};

export const returnFail: RequestHandler = (_req, res) => {
  res.status(400).send("Payment failed");
};