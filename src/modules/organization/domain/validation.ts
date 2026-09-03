import { z } from "zod";

import { databaseUuidSchema } from "@/shared/validation/database";

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(
    /^[A-Z0-9][A-Z0-9_-]*$/,
    "Use uppercase letters, numbers, underscores or hyphens.",
  );

const isoDateSchema = z.iso.date();
export const createCompanySchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().min(2).max(200).nullable().default(null),
  timezone: z.string().trim().min(1).max(80).default("Europe/Lisbon"),
});

export const createOrganizationalUnitSchema = z.object({
  companyId: databaseUuidSchema,
  type: z.enum(["DEPARTMENT", "SHARED_SERVICE"]),
  code: codeSchema,
  name: z.string().trim().min(2).max(160),
});

export const createRestaurantSchema = z.object({
  companyId: databaseUuidSchema,
  code: codeSchema,
  name: z.string().trim().min(2).max(160),
  timezone: z.string().trim().min(1).max(80).default("Europe/Lisbon"),
});

export const createProfileSchema = z.object({
  authUserId: databaseUuidSchema,
  displayName: z.string().trim().min(2).max(160),
  email: z.email(),
});

export const createAssignmentSchema = z
  .object({
    profileId: databaseUuidSchema,
    companyId: databaseUuidSchema,
    organizationalUnitId: databaseUuidSchema.nullable().default(null),
    roleId: databaseUuidSchema,
    title: z.string().trim().min(2).max(160).nullable().default(null),
    unitScopeMode: z.enum(["ASSIGNED", "COMPANY_WIDE"]),
    restaurantScopeMode: z.enum([
      "NONE",
      "ASSIGNED",
      "INHERITED",
      "COMPANY_WIDE",
    ]),
    validFrom: isoDateSchema,
    validTo: isoDateSchema.nullable().default(null),
  })
  .refine(
    ({ validFrom, validTo }) => validTo === null || validTo >= validFrom,
    {
      message: "validTo must not be earlier than validFrom",
      path: ["validTo"],
    },
  )
  .refine(
    ({ organizationalUnitId, unitScopeMode }) =>
      unitScopeMode === "COMPANY_WIDE" || organizationalUnitId !== null,
    {
      message: "ASSIGNED unit scope requires an organizational unit",
      path: ["organizationalUnitId"],
    },
  );

export const createHierarchyRelationshipSchema = z
  .object({
    parentAssignmentId: databaseUuidSchema,
    childAssignmentId: databaseUuidSchema,
    relationshipType: z.enum(["REPORTS_TO", "OPERATIONAL_RESPONSIBILITY"]),
    validFrom: isoDateSchema,
    validTo: isoDateSchema.nullable().default(null),
  })
  .refine(
    ({ parentAssignmentId, childAssignmentId }) =>
      parentAssignmentId !== childAssignmentId,
    {
      message: "An assignment cannot be its own parent",
      path: ["childAssignmentId"],
    },
  )
  .refine(
    ({ validFrom, validTo }) => validTo === null || validTo >= validFrom,
    {
      message: "validTo must not be earlier than validFrom",
      path: ["validTo"],
    },
  );

export const createRestaurantAssignmentSchema = z
  .object({
    organizationalAssignmentId: databaseUuidSchema,
    restaurantId: databaseUuidSchema,
    responsibilityType: z.enum(["PRIMARY", "SECONDARY", "COVERAGE"]),
    validFrom: isoDateSchema,
    validTo: isoDateSchema.nullable().default(null),
  })
  .refine(
    ({ validFrom, validTo }) => validTo === null || validTo >= validFrom,
    {
      message: "validTo must not be earlier than validFrom",
      path: ["validTo"],
    },
  );

export type CreateCompanyInput = z.input<typeof createCompanySchema>;
export type CreateOrganizationalUnitInput = z.input<
  typeof createOrganizationalUnitSchema
>;
export type CreateRestaurantInput = z.input<typeof createRestaurantSchema>;
export type CreateProfileInput = z.input<typeof createProfileSchema>;
export type CreateAssignmentInput = z.input<typeof createAssignmentSchema>;
export type CreateHierarchyRelationshipInput = z.input<
  typeof createHierarchyRelationshipSchema
>;
export type CreateRestaurantAssignmentInput = z.input<
  typeof createRestaurantAssignmentSchema
>;
