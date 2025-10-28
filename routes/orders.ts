import { RequestHandler, Request, Response } from "express";
import { Order } from "../models/Order";

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, totals, address]
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Validation error
 */
export const createOrder: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id as string;
    const { items, totals, address } = req.body || {};
    if (!items || !totals || !address) {
      return res.status(400).json({ message: "items, totals, address required" });
    }
    const order = await Order.create({ userId, items, totals, address });
    res.status(201).json(order.toJSON());
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/orders/my:
 *   get:
 *     summary: Get my orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of current user's orders
 */
export const getMyOrders: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id as string;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.json({ orders: orders.map(o => o.toJSON()) });
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List all orders (admin/cashier)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all orders
 */
export const adminListOrders: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ orders: orders.map(o => o.toJSON()) });
  } catch (error) {
    console.error("List orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/orders/{orderId}/status:
 *   patch:
 *     summary: Update order status (admin/cashier)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, in_transit, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Order not found
 */
export const updateOrderStatus: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params as { orderId: string };
    const { status } = req.body || {};
    const okStatuses = ["pending", "processing", "in_transit", "delivered", "cancelled"] as const;
    if (!okStatuses.includes(status)) return res.status(400).json({ message: "Invalid status" });
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order.toJSON());
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


