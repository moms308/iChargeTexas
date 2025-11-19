import { createTRPCReact } from "@trpc/react-query";
import { httpLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";

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
      url: `${getBaseUrl()}/api/trpc`,
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
