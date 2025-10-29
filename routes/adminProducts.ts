import { RequestHandler } from "express";
import { Product } from "../models/Product";
import { Category } from "../models/Category";

// Product Management

/**
 * @swagger
 * /api/admin/products:
 *   post:
 *     summary: Create new product (Admin/Moderator)
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slug
 *               - title
 *               - gender
 *               - ageRange
 *               - categorySlug
 *               - price
 *               - description
 *               - material
 *               - care
 *             properties:
 *               slug:
 *                 type: string
 *               title:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [boy, girl, unisex]
 *               ageRange:
 *                 type: string
 *                 enum: [0-3m, 3-6m, 6-12m, 1-3y, 3-5y, 5-7y, 7-10y]
 *               categorySlug:
 *                 type: string
 *               price:
 *                 type: number
 *               oldPrice:
 *                 type: number
 *               colors:
 *                 type: array
 *                 items:
 *                   type: string
 *               sizes:
 *                 type: array
 *                 items:
 *                   type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *               material:
 *                 type: string
 *               care:
 *                 type: string
 *               available:
 *                 type: boolean
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Product created
 */
export const createProduct: RequestHandler = async (req, res) => {
  try {
    const {
      slug,
      title,
      gender,
      ageRange,
      categorySlug,
      price,
      oldPrice,
      colors,
      sizes,
      images,
      description,
      material,
      care,
      available,
      tags
    } = req.body;

    // Check if product with slug already exists
    const existingProduct = await Product.findOne({ slug });
    if (existingProduct) {
      return res.status(400).json({ message: "Product with this slug already exists" });
    }

    // Verify category exists
    const category = await Category.findOne({ slug: categorySlug });
    if (!category) {
      return res.status(400).json({ message: "Category not found" });
    }

    const product = new Product({
      slug,
      title,
      gender,
      ageRange,
      categorySlug,
      price,
      oldPrice,
      colors: colors || [],
      sizes: sizes || [],
      images: images || [],
      description,
      material,
      care,
      available: available !== false,
      tags: tags || []
    });

    await product.save();

    res.status(201).json({
      message: "Product created successfully",
      product
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/admin/products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product updated
 */
export const updateProduct: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // If categorySlug is being updated, verify it exists
    if (updateData.categorySlug && updateData.categorySlug !== product.categorySlug) {
      const category = await Category.findOne({ slug: updateData.categorySlug });
      if (!category) {
        return res.status(400).json({ message: "Category not found" });
      }
    }

    // Update product
    Object.assign(product, updateData);
    await product.save();

    res.json({
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/admin/products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 */
export const deleteProduct: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Product.findByIdAndDelete(id);

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Category Management

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create new category (Admin/Moderator)
 *     tags: [Admin Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slug
 *               - title
 *             properties:
 *               slug:
 *                 type: string
 *               title:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 */
export const createCategory: RequestHandler = async (req, res) => {
  try {
    const { slug, title, icon } = req.body;

    // Check if category with slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: "Category with this slug already exists" });
    }

    const category = new Category({
      slug,
      title,
      icon
    });

    await category.save();

    res.status(201).json({
      message: "Category created successfully",
      category
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Admin Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category updated
 */
export const updateCategory: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { slug, title, icon } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // If slug is being changed, check for conflicts
    if (slug && slug !== category.slug) {
      const existingCategory = await Category.findOne({ slug });
      if (existingCategory) {
        return res.status(400).json({ message: "Category with this slug already exists" });
      }
    }

    // Update category
    if (slug) category.slug = slug;
    if (title) category.title = title;
    if (icon !== undefined) category.icon = icon;

    await category.save();

    res.json({
      message: "Category updated successfully",
      category
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete category
 *     tags: [Admin Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted
 */
export const deleteCategory: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if any products use this category
    const productsCount = await Product.countDocuments({ categorySlug: category.slug });
    if (productsCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. ${productsCount} products are using this category.` 
      });
    }

    await Category.findByIdAndDelete(id);

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Server error" });
  }
};