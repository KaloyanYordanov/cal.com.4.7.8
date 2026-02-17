import { z } from "zod";

export const ZAdminGetAllBookingsSchema = z.object({
  afterStartDate: z.string(),
  beforeEndDate: z.string(),
  userIds: z.number().array().optional(),
  teamIds: z.number().array().optional(),
  eventTypeIds: z.number().array().optional(),
  status: z.enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"]).optional(),
  limit: z.number().min(1).max(500).nullish(),
  cursor: z.number().nullish(),
});

export type TAdminGetAllBookingsSchema = z.infer<typeof ZAdminGetAllBookingsSchema>;
