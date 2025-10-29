
import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  id: string;
  slug: string;
  title: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    icon: { type: String }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Category = mongoose.model<ICategory>("Category", CategorySchema);

