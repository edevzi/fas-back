import { RequestHandler } from "express";
import { Product } from "../models/Product";

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with optional filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title, description, or material
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [boy, girl, unisex]
 *         description: Filter by gender
 *       - in: query
 *         name: age
 *         schema:
 *           type: string
 *           enum: [0-3m, 3-6m, 6-12m, 1-3y, 3-5y, 5-7y, 7-10y]
 *         description: Filter by age range
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category slug
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 total:
 *                   type: number
 *                 page:
 *                   type: number
 *                 limit:
 *                   type: number
 */
export const getProducts: RequestHandler = async (req, res) => {
  try {
    const {
      search,
      gender,
      age,
      category,
      minPrice,
      maxPrice,
      available,
      page = "1",
      limit = "20"
    } = req.query;

    const query: any = {};

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { material: { $regex: search, $options: "i" } }
      ];
    }

    // Filters
    if (gender) query.gender = gender;
    if (age) query.ageRange = age;
    if (category) query.categorySlug = category;
    if (available !== undefined) query.available = available === "true";

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Product.countDocuments(query);

    res.json({
      products,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    console.error("Error fetching products (DB)", error);
    // Fallback to mock data to keep dev UX working if DB is unavailable
    try {
      const fs = await import("fs");
      const path = await import("path");
      const { fileURLToPath } = await import("url");
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.resolve(__dirname, "../../public/mocks/products.json");
      const raw = fs.readFileSync(filePath, "utf-8");
      const all = JSON.parse(raw) as any[];

      // Basic filtering/pagination to mimic API
      const {
        search,
        gender,
        age,
        category,
        minPrice,
        maxPrice,
        available,
        page = "1",
        limit = "20"
      } = req.query as Record<string, string>;

      let filtered = all;
      if (search) {
        const q = String(search).toLowerCase();
        filtered = filtered.filter(p => (
          String(p.title).toLowerCase().includes(q) ||
          String(p.description).toLowerCase().includes(q) ||
          String(p.material).toLowerCase().includes(q)
        ));
      }
      if (gender) filtered = filtered.filter(p => p.gender === gender);
      if (age) filtered = filtered.filter(p => p.ageRange === age);
      if (category) filtered = filtered.filter(p => p.categorySlug === category);
      if (available !== undefined) filtered = filtered.filter(p => Boolean(p.available) === (String(available) === "true"));
      if (minPrice) filtered = filtered.filter(p => Number(p.price) >= Number(minPrice));
      if (maxPrice) filtered = filtered.filter(p => Number(p.price) <= Number(maxPrice));

      const pageNum = parseInt(String(page));
      const limitNum = parseInt(String(limit));
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum;

      const products = filtered.slice(start, end);
      const total = filtered.length;

      return res.json({ products, total, page: pageNum, limit: limitNum });
    } catch (fallbackErr) {
      console.error("Error serving mock products fallback", fallbackErr);
      res.status(500).json({ message: "Server error" });
    }
  }
};

/**
 * @swagger
 * /api/products/{slug}:
 *   get:
 *     summary: Get a single product by slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Product slug
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
export const getProductBySlug: RequestHandler = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug }).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product (DB)", error);
    // Fallback to mock data
    try {
      const fs = await import("fs");
      const path = await import("path");
      const { fileURLToPath } = await import("url");
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.resolve(__dirname, "../../public/mocks/products.json");
      const raw = fs.readFileSync(filePath, "utf-8");
      const all = JSON.parse(raw) as any[];
      const one = all.find(p => p.slug === req.params.slug);
      if (!one) return res.status(404).json({ message: "Product not found" });
      return res.json(one);
    } catch (fallbackErr) {
      console.error("Error serving mock product fallback", fallbackErr);
      res.status(500).json({ message: "Server error" });
    }
  }
};

