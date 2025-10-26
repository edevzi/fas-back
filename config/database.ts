import mongoose from "mongoose";

const connectDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb+srv://edevzi:edevzi1234@cluster0.cwdvaas.mongodb.net/faskids?retryWrites=true&w=majority&appName=Cluster0";
    
    await mongoose.connect(mongoURI);
    
    console.log("✅ MongoDB connected successfully");
    
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });
    
    mongoose.connection.on("disconnected", () => {
      console.log("⚠️  MongoDB disconnected");
    });
    
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default connectDatabase;

