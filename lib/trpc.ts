import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location) {
    return window.location.origin;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
};

const trpcLinks = [
  loggerLink({
    enabled: (opts) =>
      process.env.NODE_ENV === "development" ||
      (opts.direction === "down" && opts.result instanceof Error),
  }),
  httpLink({
    transformer: superjson,
    url: `${getBaseUrl()}/api/trpc`,
    async headers() {
      const headers: Record<string, string> = {};
      
      try {
        const storedUser = await AsyncStorage.getItem("@current_user");
        if (storedUser && storedUser !== "null" && storedUser !== "undefined") {
          try {
            const user = JSON.parse(storedUser);
            headers.authorization = `Bearer ${user.id}`;
          } catch (e) {
            console.error("[tRPC] Error parsing stored user:", e);
          }
        }
        
        const tenantId = await AsyncStorage.getItem("@current_tenant_id");
        if (tenantId && tenantId !== "null" && tenantId !== "undefined") {
          headers["x-tenant-id"] = tenantId;
        }
      } catch (e) {
        console.log("[tRPC] AsyncStorage not available, skipping headers");
      }
      
      return headers;
    },
    async fetch(url, options) {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`[tRPC Client] HTTP Error ${response.status}`);
        console.error(`[tRPC Client] URL: ${url}`);
        console.error(`[tRPC Client] Body: ${text.substring(0, 500)}`);
        
        let errorMessage = `HTTP Error ${response.status}`;
        try {
          const jsonError = JSON.parse(text);
          errorMessage = jsonError.error?.message || jsonError.message || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
        
        const errorResponse = new Response(
          JSON.stringify({
            error: {
              message: errorMessage,
              code: "HTTP_ERROR",
              data: {
                httpStatus: response.status,
              },
            },
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          }
        );
        return errorResponse;
      }
      
      return response;
    },
  }),
];

export const trpcReactClient = trpc.createClient({
  links: trpcLinks,
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: trpcLinks,
});
