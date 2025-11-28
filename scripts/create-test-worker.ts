import { trpcClient } from "../lib/trpc";

async function createTestWorker() {
  try {
    console.log("Creating test worker 'elena'...");
    
    const result = await trpcClient.auth.createEmployee.mutate({
      username: "elena",
      password: "bacon",
      fullName: "elena",
      email: "ichargetexas@gmail.com",
      phone: "9034520052",
      role: "worker",
      permissions: {
        canManageUsers: false,
        canViewReports: true,
        canHandleRequests: true,
        canCreateInvoices: true,
        canViewCustomerInfo: true,
        canDeleteData: false,
      },
    });
    
    console.log("✅ Worker created successfully!");
    console.log("User details:", result.employee);
    
    return result;
  } catch (error: any) {
    console.error("❌ Error creating worker:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      data: error.data,
    });
    throw error;
  }
}

createTestWorker()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
