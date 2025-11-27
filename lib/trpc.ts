import { createTRPCReact } from "@trpc/react-query";
import { httpLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

export const trpcClient = trpc.createClient({
  links: [
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
        
        return headers;
      },
      async fetch(url, options) {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          const text = await response.text();
          console.error(`[tRPC Client] HTTP Error ${response.status} ${response.statusText}`);
          console.error(`[tRPC Client] URL: ${url}`);
          console.error(`[tRPC Client] Body: ${text.substring(0, 1000)}`);
          
          const errorResponse = new Response(
            JSON.stringify({
              error: {
                message: text || `HTTP Error ${response.status}`,
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
  ],
});
