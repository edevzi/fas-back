import { RequestHandler } from "express";

export const notifyTelegram: RequestHandler = async (req, res) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!token || !chatId) return res.status(500).json({ message: "TELEGRAM env missing" });

    const { message } = req.body || {};
    if (!message) return res.status(400).json({ message: "message required" });

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });

    const data = await resp.json();
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ message: "telegram error" });
  }
};