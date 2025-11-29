import app from "../backend/hono";

console.log("[API Route] Loading edge function");

export const config = {
  runtime: "edge",
};

const handler = async (req: Request) => {
  const url = new URL(req.url);
  console.log(`[API Route Handler] ${req.method} ${url.pathname}`);
  console.log(`[API Route Handler] Full URL: ${req.url}`);
  console.log(`[API Route Handler] Headers:`, Object.fromEntries(req.headers.entries()));
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-Id",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  
  try {
    const response = await app.fetch(req);
    console.log(`[API Route Handler] Response status: ${response.status}`);
    
    if (response.status === 404) {
      const text = await response.text();
      console.error(`[API Route Handler] 404 Response body: ${text}`);
      
      return new Response(text, {
        status: 404,
        statusText: response.statusText,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-Id",
        },
      });
    }
    
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-Id");
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    console.error("[API Route Handler] Error:", error);
    console.error("[API Route Handler] Error stack:", error instanceof Error ? error.stack : 'N/A');
    return new Response(JSON.stringify({ error: "Internal server error", message: String(error) }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
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
export const HEAD = handler;
