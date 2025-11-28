import { z } from "zod";
import { publicProcedure } from "../../../create-context";

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

export const calculateDistanceProcedure = publicProcedure
  .input(
    z.object({
      requestId: z.string(),
      acceptorCoordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
      tenantId: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    console.log(
      `[Calculate Distance] Processing for request ${input.requestId}`
    );

    const storageKey = input.tenantId
      ? `tenant:${input.tenantId}:requests`
      : "service_requests";

    const requests = (await ctx.kv.getJSON<any[]>(storageKey)) || [];
    const request = requests.find((r) => r.id === input.requestId);

    if (!request) {
      console.error(`[Calculate Distance] Request ${input.requestId} not found`);
      throw new Error("Request not found");
    }

    if (!request.location || typeof request.location.latitude !== "number" || typeof request.location.longitude !== "number") {
      console.error(
        `[Calculate Distance] Invalid request location for ${input.requestId}`
      );
      throw new Error("Invalid request location data");
    }

    const distanceInKm = calculateHaversineDistance(
      request.location.latitude,
      request.location.longitude,
      input.acceptorCoordinates.latitude,
      input.acceptorCoordinates.longitude
    );

    const distanceInMiles = distanceInKm * 0.621371;

    console.log(
      `[Calculate Distance] Distance calculated: ${distanceInKm.toFixed(2)} km (${distanceInMiles.toFixed(2)} miles)`
    );

    return {
      requestId: input.requestId,
      requestLocation: {
        latitude: request.location.latitude,
        longitude: request.location.longitude,
        address: request.location.address,
      },
      acceptorLocation: {
        latitude: input.acceptorCoordinates.latitude,
        longitude: input.acceptorCoordinates.longitude,
      },
      distance: {
        kilometers: parseFloat(distanceInKm.toFixed(2)),
        miles: parseFloat(distanceInMiles.toFixed(2)),
      },
    };
  });
