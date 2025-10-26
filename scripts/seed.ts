import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import connectDatabase from "../config/database";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { Comment } from "../models/Comment";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");
    
    // Connect to database
    await connectDatabase();
    
    // Read JSON files
    const productsPath = path.join(__dirname, "../../public/mocks/products.json");
    const categoriesPath = path.join(__dirname, "../../public/mocks/categories.json");
    const commentsPath = path.join(__dirname, "../../public/mocks/comments.json");
    
    const productsData = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
    const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, "utf-8"));
    const commentsData = JSON.parse(fs.readFileSync(commentsPath, "utf-8"));
    
    // Clear existing data
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Comment.deleteMany({});
    console.log("✅ Cleared existing data");
    
    // Seed Products
    // Don't include the 'id' field from JSON, let MongoDB generate _id
    const products = productsData.map((p: any) => {
      const { id, ...productData } = p;
      return productData;
    });
    await Product.insertMany(products);
    console.log(`✅ Inserted ${products.length} products`);
    
    // Seed Categories
    const categories = categoriesData.map((c: any) => {
      const { id, ...categoryData } = c;
      return categoryData;
    });
    await Category.insertMany(categories);
    console.log(`✅ Inserted ${categories.length} categories`);
    
    // Seed Comments
    const comments = commentsData.map((c: any) => {
      const { id, ...commentData } = c;
      return commentData;
    });
    await Comment.insertMany(comments);
    console.log(`✅ Inserted ${comments.length} comments`);
    
    console.log("🎉 Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;
