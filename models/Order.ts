import mongoose, { Schema, Document } from "mongoose";

export interface ICartItem {
  productId: string;
  title: string;
  slug: string;
  price: number;
  qty: number;
  color?: string;
  size?: string;
  image: string;
}

export interface IAddress {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  zip: string;
  isDefault?: boolean;
}

export interface ITotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface IDelivery {
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address: IAddress;
  estimatedTime?: number; // in minutes
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  instructions?: string;
}

export interface IOrder extends Document {
  id: string;
  userId: string;
  items: ICartItem[];
  totals: ITotals;
  status: "pending" | "confirmed" | "preparing" | "ready_for_delivery" | "in_transit" | "delivered" | "cancelled";
  address: IAddress;
  delivery: IDelivery;
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod?: "cash" | "card" | "payme" | "click";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  productId: { type: String, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
  color: { type: String },
  size: { type: String },
  image: { type: String, required: true }
}, { _id: false });

const AddressSchema = new Schema<IAddress>({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, required: true },
  street: { type: String, required: true },
  zip: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
}, { _id: false });

const TotalsSchema = new Schema<ITotals>({
  subtotal: { type: Number, required: true },
  shipping: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true }
}, { _id: false });

const DeliverySchema = new Schema<IDelivery>({
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  address: { type: AddressSchema, required: true },
  estimatedTime: { type: Number },
  courierId: { type: String },
  courierName: { type: String },
  courierPhone: { type: String },
  instructions: { type: String }
}, { _id: false });

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: String, required: true, index: true },
    items: { type: [CartItemSchema], required: true },
    totals: { type: TotalsSchema, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready_for_delivery", "in_transit", "delivered", "cancelled"],
      default: "pending",
      index: true
    },
    address: { type: AddressSchema, required: true },
    delivery: { type: DeliverySchema, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "payme", "click"]
    },
    notes: { type: String }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        // Format date for frontend
        ret.date = ret.createdAt.toISOString().split('T')[0];
        return ret;
      }
    }
  }
);

// Indexes
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>("Order", OrderSchema);

