import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import connectDatabase from "../config/database";

const createTestUsers = async () => {
  try {
    console.log("🔄 Creating test users...");

    // Admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const adminUser = new User({
      name: "System Admin",
      phone: "+998901234567",
      password: adminPassword,
      role: "admin",
      isActive: true
    });

    // Moderator user
    const moderatorPassword = await bcrypt.hash("moderator123", 10);
    const moderatorUser = new User({
      name: "Content Moderator",
      phone: "+998901234568",
      password: moderatorPassword,
      role: "moderator",
      isActive: true,
      createdBy: adminUser.id
    });

    // Regular user for testing
    const userPassword = await bcrypt.hash("user123", 10);
    const testUser = new User({
      name: "Test User",
      phone: "+998901234569",
      password: userPassword,
      role: "user",
      isActive: true,
      addresses: [
        {
          fullName: "Test User",
          phone: "+998901234569",
          country: "O'zbekiston",
          city: "Toshkent",
          street: "Amir Temur ko'chasi, 1-uy",
          zip: "100000",
          isDefault: true
        }
      ]
    });

    // Save users
    await adminUser.save();
    console.log("✅ Admin user created:");
    console.log(`   Phone: ${adminUser.phone}`);
    console.log(`   Password: admin123`);
    console.log(`   Role: ${adminUser.role}`);

    await moderatorUser.save();
    console.log("✅ Moderator user created:");
    console.log(`   Phone: ${moderatorUser.phone}`);
    console.log(`   Password: moderator123`);
    console.log(`   Role: ${moderatorUser.role}`);

    await testUser.save();
    console.log("✅ Test user created:");
    console.log(`   Phone: ${testUser.phone}`);
    console.log(`   Password: user123`);
    console.log(`   Role: ${testUser.role}`);

    return { admin: adminUser, moderator: moderatorUser, user: testUser };
  } catch (error) {
    console.error("❌ Error creating test users:", error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    console.log("🚀 Starting database seeding...");
    
    // Connect to database
    await connectDatabase();

    // Clear existing test users (optional)
    await User.deleteMany({ 
      phone: { 
        $in: ["+998901234567", "+998901234568", "+998901234569"] 
      } 
    });
    console.log("🧹 Cleaned up existing test users");

    // Create test users
    await createTestUsers();

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📋 Test Accounts:");
    console.log("┌─────────────────────────────────────────┐");
    console.log("│ ADMIN ACCOUNT                           │");
    console.log("│ Phone: +998901234567                    │");
    console.log("│ Password: admin123                      │");
    console.log("│ Role: Admin (Full Access)               │");
    console.log("├─────────────────────────────────────────┤");
    console.log("│ MODERATOR ACCOUNT                       │");
    console.log("│ Phone: +998901234568                    │");
    console.log("│ Password: moderator123                  │");
    console.log("│ Role: Moderator (Limited Admin Access) │");
    console.log("├─────────────────────────────────────────┤");
    console.log("│ USER ACCOUNT                            │");
    console.log("│ Phone: +998901234569                    │");
    console.log("│ Password: user123                       │");
    console.log("│ Role: User (Customer Access)            │");
    console.log("└─────────────────────────────────────────┘");

    process.exit(0);
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();