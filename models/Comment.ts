import { Schema, model } from "mongoose";

const CommentSchema = new Schema(
  {
    productId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userAvatar: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    date: String,
    verified: { type: Boolean, default: false },
    helpful: { type: Number, default: 0 },
    images: [String],
    size: String,
    color: String,
  },
  { timestamps: true }
);

export const Comment = model("Comment", CommentSchema);

import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  verified: boolean;
  helpful: number;
  images?: string[];
  size?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userAvatar: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: String, required: true },
    verified: { type: Boolean, default: false },
    helpful: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    size: { type: String },
    color: { type: String }
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

// Indexes
CommentSchema.index({ productId: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>("Comment", CommentSchema);

