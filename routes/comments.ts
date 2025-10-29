import { RequestHandler } from "express";
import { Comment } from "../models/Comment";
import { Product } from "../models/Product";
import mongoose from "mongoose";

/**
 * @swagger
 * /api/products/{productId}/comments:
 *   get:
 *     summary: Get comments for a product
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, helpful, rating]
 *           default: newest
 *         description: Sort order
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, verified, withImages]
 *           default: all
 *         description: Filter comments
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 */
export const getProductComments: RequestHandler = async (req, res) => {
  try {
    const { productId } = req.params;
    const { sort = "newest", filter = "all" } = req.query;

    let query: any = { productId };

    // Apply filters
    if (filter === "verified") {
      query.verified = true;
    } else if (filter === "withImages") {
      query.images = { $exists: true, $ne: [] };
    }

    // Sort
    let sortOption: any = { createdAt: -1 };
    if (sort === "helpful") {
      sortOption = { helpful: -1 };
    } else if (sort === "rating") {
      sortOption = { rating: -1 };
    }

    const comments = await Comment.find(query)
      .sort(sortOption)
      .lean();

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/products/{productId}/comments:
 *   post:
 *     summary: Create a new comment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - userName
 *               - rating
 *               - title
 *               - content
 *             properties:
 *               userId:
 *                 type: string
 *               userName:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               size:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 */
export const createComment: RequestHandler = async (req, res) => {
  try {
    const { productId } = req.params;
    const { userId, userName, rating, title, content, images, size, color } = req.body;

    // Create comment
    const comment = new Comment({
      productId,
      userId,
      userName,
      rating,
      title,
      content,
      images: images || [],
      size,
      color,
      date: new Date().toISOString().split('T')[0],
      verified: false,
      helpful: 0
    });

    await comment.save();

    // Update product rating
    await updateProductRating(productId);

    res.status(201).json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to update product rating
const updateProductRating = async (productId: string) => {
  try {
    const comments = await Comment.find({ productId });
    if (comments.length === 0) return;

    const averageRating = comments.reduce((sum, c) => sum + c.rating, 0) / comments.length;
    const reviewCount = comments.length;

    // Find product by id (string format)
    await Product.updateOne(
      { _id: new mongoose.Types.ObjectId(productId) },
      { rating: Math.round(averageRating * 10) / 10, reviewCount }
    );
  } catch (error) {
    console.error("Error updating product rating:", error);
  }
};

/**
 * @swagger
 * /api/comments/{commentId}/helpful:
 *   post:
 *     summary: Mark a comment as helpful
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment updated
 */
export const markHelpful: RequestHandler = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    await Comment.updateOne(
      { _id: commentId }, 
      { $inc: { helpful: 1 } }
    );
    res.json({ message: "Marked as helpful" });
  } catch (error) {
    console.error("Error marking comment as helpful:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @swagger
 * /api/users/{userId}/comments:
 *   get:
 *     summary: Get user comments
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of user comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 */
export const getUserComments: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;

    const comments = await Comment.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // Manually populate product data
    const commentsWithProducts = await Promise.all(
      comments.map(async (comment) => {
        try {
          const product = await Product.findById(comment.productId)
            .select('slug title images price')
            .lean();
          
          return {
            ...comment,
            productId: product || comment.productId // If product not found, keep original productId
          };
        } catch (error) {
          console.error("Error fetching product for comment:", error);
          return comment;
        }
      })
    );

    res.json(commentsWithProducts);
  } catch (error) {
    console.error("Error fetching user comments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

