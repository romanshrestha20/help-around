// utils/validateRegisterInput.ts
import * as z from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),

  // Accepts "YYYY-MM-DD" and converts to Date
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .transform((str) => new Date(str))
    .refine((date) => !isNaN(date.getTime()), { message: "Invalid date" }),

  // Accepts lowercase but validates against enum
  gender: z
    .string()
    .transform((val) => val.toUpperCase())
    .refine((val) => ["MALE", "FEMALE", "OTHER"].includes(val), {
      message: "Gender must be MALE, FEMALE, or OTHER",
    }),
});

// Type AFTER Zod transforms
export type RegisterInput = z.infer<typeof registerSchema>;
