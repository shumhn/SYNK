import { z } from "zod";

export const userSchema = z.object({
  username: z
    .string({ required_error: "Username is required", invalid_type_error: "Username must be a string" })
    .min(3, { message: "Username must be at least 3 characters long" })
    .max(30, { message: "Username must be at most 30 characters long" }),
  email: z
    .string({ required_error: "Email is required", invalid_type_error: "Email must be a string" })
    .email({ message: "Invalid email address" })
    .refine((email) => !email.includes(" "), {
      message: "Email cannot contain spaces",
    }),
  password: z
    .string({ required_error: "Password is required", invalid_type_error: "Password must be a string" })
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(30, { message: "Password must be at most 30 characters long" })
    .refine(
      (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(password),
      {
        message: "Password must be at least 8 characters, with uppercase, lowercase, number, and special character",
      }
    ),
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});