import app from "../backend/hono";

console.log("[API Route] Loading edge function");
console.log("[API Route] Hono app type:", typeof app);
console.log("[API Route] Hono app has fetch:", typeof app.fetch);

export const config = {
  runtime: "edge",
};

const handler = async (req: Request, ctx?: any) => {
  console.log(`[API Route Handler] ${req.method} ${req.url}`);
  try {
    const response = await app.fetch(req, ctx);
    console.log(`[API Route Handler] Response status: ${response.status}`);
    return response;
  } catch (error) {
    console.error("[API Route Handler] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", message: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export default handler;
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
