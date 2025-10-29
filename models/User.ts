
import mongoose, { Schema, Document } from "mongoose";

export interface IAddress {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  zip: string;
  isDefault?: boolean;
}

export interface IUser extends Document {
  id: string;
  name: string;
  password: string;
  phone: string;
  role: "admin" | "cashier" | "user";
  addresses: IAddress[];
  wishlist: string[];
  recentlyViewed: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, required: true },
  street: { type: String, required: true },
  zip: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ["admin", "cashier", "user"], default: "user", index: true },
    addresses: { type: [AddressSchema], default: [] },
    wishlist: { type: [String], default: [] },
    recentlyViewed: { type: [String], default: [] }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        delete (ret as any)._id;
        delete (ret as any).__v;
        delete (ret as any).password;
        return ret;
      }
    }
  }
);

export const User = mongoose.model<IUser>("User", UserSchema);

