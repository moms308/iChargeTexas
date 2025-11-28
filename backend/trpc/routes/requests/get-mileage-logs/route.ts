import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { JobAcceptanceLog } from "@/constants/types";

export const getMileageLogsProcedure = publicProcedure
  .input(
    z.object({
      tenantId: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    console.log(`[Get Mileage Logs] Fetching mileage logs`);

    const storageKey = input.tenantId
      ? `tenant:${input.tenantId}:requests`
      : "service_requests";

    const requests = (await ctx.kv.getJSON<any[]>(storageKey)) || [];

    const mileageLogs: {
      requestId: string;
      requestTitle: string;
      customerName: string;
      serviceType: string;
      requestLocation: {
        latitude: number;
        longitude: number;
        address?: string;
      };
      acceptanceLogs: JobAcceptanceLog[];
      createdAt: string;
      status: string;
    }[] = [];

    for (const request of requests) {
      if (request.acceptanceLogs && request.acceptanceLogs.length > 0) {
        mileageLogs.push({
          requestId: request.id,
          requestTitle: request.title,
          customerName: request.name,
          serviceType: request.type === "roadside" ? "Roadside Assistance" : "EV Charging",
          requestLocation: {
            latitude: request.location.latitude,
            longitude: request.location.longitude,
            address: request.location.address,
          },
          acceptanceLogs: request.acceptanceLogs,
          createdAt: request.createdAt,
          status: request.status,
        });
      }
    }

    mileageLogs.sort((a, b) => {
      const aLatestLog = a.acceptanceLogs[a.acceptanceLogs.length - 1];
      const bLatestLog = b.acceptanceLogs[b.acceptanceLogs.length - 1];
      return new Date(bLatestLog.acceptedAt).getTime() - new Date(aLatestLog.acceptedAt).getTime();
    });

    console.log(`[Get Mileage Logs] Found ${mileageLogs.length} requests with acceptance logs`);

    return {
      mileageLogs,
      total: mileageLogs.length,
    };
  });
