import app from "../backend/hono";

console.log("[API Route] Loading edge function");

export const config = {
  runtime: "edge",
};

const handler = async (req: Request) => {
  const url = new URL(req.url);
  console.log(`[API Route Handler] ${req.method} ${url.pathname}`);
  
  try {
    const response = await app.fetch(req);
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
