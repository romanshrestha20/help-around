// /utils/validateUserInput.ts

import * as z from "zod";

export const userProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  bio: z.string().max(1000).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .transform((str: string) => new Date(str))
    .refine((date: Date) => !isNaN(date.getTime()), { message: "Invalid date" })
    .optional(),
  gender: z
    .string()
    .transform((val: string) => val.toUpperCase())
    .refine((val: string) => ["MALE", "FEMALE", "OTHER"].includes(val), {
      message: "Gender must be MALE, FEMALE, or OTHER",
    })
    .optional(),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;
