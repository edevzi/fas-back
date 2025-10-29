import { RequestHandler } from "express";
import { Order } from "../models/Order";

// Order Management for Admin

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders (Admin/Moderator)
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, preparing, ready_for_delivery, in_transit, delivered, cancelled]
 *     responses:
 *       200:
 *         description: List of orders
 */
export const getAllOrders: RequestHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    let query: any = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, preparing, ready_for_delivery, in_transit, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated
 */
export const updateOrderStatus: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    await order.save();

    res.json({
      message: "Order status updated successfully",
      order
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/admin/orders/{id}/courier:
 *   put:
 *     summary: Assign courier to order
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courierId
 *               - courierName
 *               - courierPhone
 *             properties:
 *               courierId:
 *                 type: string
 *               courierName:
 *                 type: string
 *               courierPhone:
 *                 type: string
 *               estimatedTime:
 *                 type: number
 *     responses:
 *       200:
 *         description: Courier assigned
 */
export const assignCourier: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { courierId, courierName, courierPhone, estimatedTime } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update delivery information
    order.delivery.courierId = courierId;
    order.delivery.courierName = courierName;
    order.delivery.courierPhone = courierPhone;
    if (estimatedTime) order.delivery.estimatedTime = estimatedTime;

    await order.save();

    res.json({
      message: "Courier assigned successfully",
      order
    });
  } catch (error) {
    console.error("Error assigning courier:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delivery Location Handling

/**
 * @swagger
 * /api/delivery/calculate:
 *   post:
 *     summary: Calculate delivery time and cost based on location
 *     tags: [Delivery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *               - address
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               address:
 *                 type: object
 *                 properties:
 *                   fullName:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   city:
 *                     type: string
 *                   street:
 *                     type: string
 *     responses:
 *       200:
 *         description: Delivery calculated
 */
export const calculateDelivery: RequestHandler = async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    // Mock delivery calculation - replace with real logic
    // This would integrate with Yandex Maps or similar service
    
    // Base delivery point (your shop location)
    const shopLatitude = 41.2995; // Tashkent center
    const shopLongitude = 69.2401;

    // Calculate distance (simplified Haversine formula)
    const R = 6371; // Earth's radius in km
    const dLat = (latitude - shopLatitude) * Math.PI / 180;
    const dLon = (longitude - shopLongitude) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(shopLatitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km

    // Calculate delivery cost and time
    let deliveryCost = 0;
    let estimatedTime = 30; // Base time in minutes

    if (distance <= 5) {
      deliveryCost = 15000; // 15,000 som for nearby
      estimatedTime = 30;
    } else if (distance <= 15) {
      deliveryCost = 25000; // 25,000 som for medium distance
      estimatedTime = 45;
    } else {
      deliveryCost = 35000; // 35,000 som for far distance
      estimatedTime = 60;
    }

    res.json({
      distance: Math.round(distance * 100) / 100,
      deliveryCost,
      estimatedTime,
      coordinates: {
        latitude,
        longitude
      },
      address
    });
  } catch (error) {
    console.error("Error calculating delivery:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/delivery/track/{orderId}:
 *   get:
 *     summary: Track order delivery status
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order tracking information
 */
export const trackOrder: RequestHandler = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Create tracking timeline
    const timeline = [];
    
    timeline.push({
      status: "pending",
      title: "Buyurtma qabul qilindi",
      description: "Sizning buyurtmangiz qabul qilingan",
      timestamp: order.createdAt,
      completed: true
    });

    if (["confirmed", "preparing", "ready_for_delivery", "in_transit", "delivered"].includes(order.status)) {
      timeline.push({
        status: "confirmed",
        title: "Buyurtma tasdiqlandi",
        description: "Buyurtmangiz tasdiqlangan va tayyorlanmoqda",
        completed: true
      });
    }

    if (["preparing", "ready_for_delivery", "in_transit", "delivered"].includes(order.status)) {
      timeline.push({
        status: "preparing",
        title: "Tayyorlanmoqda",
        description: "Mahsulotlar yig'ilib, qadoqlanmoqda",
        completed: true
      });
    }

    if (["ready_for_delivery", "in_transit", "delivered"].includes(order.status)) {
      timeline.push({
        status: "ready_for_delivery",
        title: "Yetkazish uchun tayyor",
        description: "Buyurtma kuryerga berilish uchun tayyor",
        completed: true
      });
    }

    if (["in_transit", "delivered"].includes(order.status)) {
      timeline.push({
        status: "in_transit",
        title: "Yo'lda",
        description: `Kuryer: ${order.delivery.courierName || 'Noma\'lum'}`,
        completed: true
      });
    }

    if (order.status === "delivered") {
      timeline.push({
        status: "delivered",
        title: "Yetkazib berildi",
        description: "Buyurtma muvaffaqiyatli yetkazib berildi",
        completed: true
      });
    }

    res.json({
      order: {
        id: order.id,
        status: order.status,
        total: order.totals.total,
        estimatedTime: order.delivery.estimatedTime
      },
      timeline,
      courier: order.delivery.courierId ? {
        name: order.delivery.courierName,
        phone: order.delivery.courierPhone
      } : null
    });
  } catch (error) {
    console.error("Error tracking order:", error);
    res.status(500).json({ message: "Server error" });
  }
};