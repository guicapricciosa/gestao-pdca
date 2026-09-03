import { z } from "zod";

// PostgreSQL accepts all canonical UUID bit patterns. z.uuid() intentionally
// rejects some valid database fixtures because it enforces RFC version bits.
export const databaseUuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Invalid UUID",
  );
