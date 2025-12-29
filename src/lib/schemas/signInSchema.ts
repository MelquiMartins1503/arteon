import z from "zod";

export const signInSchema = z.object({
  email: z.email({ message: "Por favor, informe um e-mail válido." }),
  password: z
    .string()
    .min(8, { message: "Sua senha precisa ter pelo menos 8 caracteres." })
    .max(64, { message: "Sua senha pode ter no máximo 64 caracteres." }),
});

export type SignInSchema = z.infer<typeof signInSchema>;
