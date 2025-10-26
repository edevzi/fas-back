import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  id: string;
  slug: string;
  title: string;
  gender: "boy" | "girl" | "unisex";
  ageRange: "0-3m" | "3-6m" | "6-12m" | "1-3y" | "3-5y" | "5-7y" | "7-10y";
  categorySlug: string;
  price: number;
  oldPrice?: number;
  colors: string[];
  sizes: string[];
  images: string[];
  rating?: number;
  reviewCount?: number;
  available: boolean;
  description: string;
  material: string;
  care: string;
  tags?: string[];
  recommendedProducts?: string[];
  similarProducts?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    gender: { type: String, enum: ["boy", "girl", "unisex"], required: true, index: true },
    ageRange: { type: String, enum: ["0-3m", "3-6m", "6-12m", "1-3y", "3-5y", "5-7y", "7-10y"], required: true, index: true },
    categorySlug: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    colors: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    images: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    available: { type: Boolean, default: true, index: true },
    description: { type: String, required: true },
    material: { type: String, required: true },
    care: { type: String, required: true },
    tags: { type: [String], default: [] },
    recommendedProducts: { type: [String], default: [] },
    similarProducts: { type: [String], default: [] }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for better query performance
ProductSchema.index({ categorySlug: 1, available: 1 });
ProductSchema.index({ gender: 1, ageRange: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdAt: -1 });

export const Product = mongoose.model<IProduct>("Product", ProductSchema);

