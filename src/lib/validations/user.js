import { z } from "zod";

export const SignupSchema = z.object({
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



export const LoginSchema = z.object({
    email : z.string({ required_error: "Email is required", invalid_type_error: "Email must be a string" })
    .email({ message: "Invalid email address" })
    .refine((email) => !email.includes(" "), {
      message: "Email cannot contain spaces",
    }),
    password : z.string({ required_error: "Password is required", invalid_type_error: "Password must be a string" })
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(30, { message: "Password must be at most 30 characters long" })
    .refine(
      (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(password),
      {
        message: "Password must be at least 8 characters, with uppercase, lowercase, number, and special character",
      }
    )
})

export const UserRoleEnum = z.enum(["admin", "hr", "manager", "employee", "viewer"]);

export const CreateUserSchema = z.object({
  username: z
    .string({ required_error: "Username is required", invalid_type_error: "Username must be a string" })
    .min(3, { message: "Username must be at least 3 characters long" })
    .max(30, { message: "Username must be at most 30 characters long" }),
  email: z
    .string({ required_error: "Email is required", invalid_type_error: "Email must be a string" })
    .email({ message: "Invalid email address" })
    .refine((email) => !email.includes(" "), { message: "Email cannot contain spaces" }),
  password: z
    .string({ invalid_type_error: "Password must be a string" })
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(30, { message: "Password must be at most 30 characters long" })
    .refine((password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(password), {
      message: "Password must be at least 8 characters, with uppercase, lowercase, number, and special character",
    })
    .optional(),
  roles: z.array(UserRoleEnum).optional(),
  permissions: z.array(z.string()).optional(),
  department: z.string().optional(),
  team: z.string().optional(),
  designation: z.string().optional(),
  employmentType: z.enum(["full_time", "part_time", "contractor"]).optional(),
  image: z.string().optional(),
  profile: z
    .object({
      skills: z.array(z.string()).optional(),
      experience: z
        .array(
          z.object({
            company: z.string().optional(),
            title: z.string().optional(),
            startDate: z.string().datetime().optional(),
            endDate: z.string().datetime().optional(),
            description: z.string().optional(),
          })
        )
        .optional(),
      social: z
        .object({
          linkedin: z.string().optional(),
          github: z.string().optional(),
          twitter: z.string().optional(),
          website: z.string().optional(),
        })
        .optional(),
      completion: z.number().min(0).max(100).optional(),
    })
    .optional(),
}).strict();

export const UpdateUserSchema = CreateUserSchema.partial().strict();

export const AssignRolesSchema = z.object({
  roles: z.array(UserRoleEnum).min(1, "At least one role required"),
  permissions: z.array(z.string()).optional(),
});