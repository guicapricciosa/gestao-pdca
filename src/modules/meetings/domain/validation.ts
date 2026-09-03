import { z } from "zod";

import { databaseUuidSchema } from "@/shared/validation/database";

const scope = {
  companyId: databaseUuidSchema,
  visibility: z.enum(["NORMAL", "RESTRICTED", "PRIVATE"]),
  unitIds: z.array(databaseUuidSchema),
  restaurantIds: z.array(databaseUuidSchema),
};

export const createMeetingSeriesSchema = z.object({
  ...scope,
  title: z.string().trim().min(2).max(240),
  description: z.string().trim().max(20_000).nullable(),
  meetingType: z.string().trim().min(2).max(32),
  defaultChairProfileId: databaseUuidSchema.nullable(),
  recurrenceRule: z.string().trim().max(500).nullable(),
});

export const createMeetingSessionSchema = z
  .object({
    ...scope,
    title: z.string().trim().min(2).max(240),
    meetingSeriesId: databaseUuidSchema.nullable(),
    chairProfileId: databaseUuidSchema,
    scheduledStartAt: z.iso.datetime({ local: true }),
    scheduledEndAt: z.iso.datetime({ local: true }),
  })
  .refine(
    (value) =>
      new Date(value.scheduledEndAt) > new Date(value.scheduledStartAt),
    { message: "Meeting end must be after start" },
  );
