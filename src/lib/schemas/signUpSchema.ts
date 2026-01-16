import { z } from "zod/v4";

/**
 * Regex patterns para validação
 */
const REGEX_PATTERNS = {
  // Pelo menos uma letra maiúscula
  uppercase: /[A-Z]/,
  // Pelo menos uma letra minúscula
  lowercase: /[a-z]/,
  // Pelo menos um número
  number: /[0-9]/,
  // Pelo menos um caractere especial
  specialChar: /[!@#$%&*()_+\-=[\]{};':"\\|,.<>/?]/,
  // Email mais rigoroso
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
} as const;

/**
 * Mensagens de erro padronizadas
 */
const ERROR_MESSAGES = {
  name: {
    required: "O nome completo é obrigatório",
    invalid: "Informe nome e sobrenome válidos (mínimo 2 caracteres cada)",
    tooShort: "O nome deve ter pelo menos 3 caracteres",
    tooLong: "O nome pode ter no máximo 100 caracteres",
  },
  email: {
    required: "O e-mail é obrigatório",
    invalid: "Informe um e-mail válido",
    tooLong: "O e-mail pode ter no máximo 255 caracteres",
  },
  password: {
    required: "A senha é obrigatória",
    tooShort: "A senha deve ter pelo menos 8 caracteres",
    tooLong: "A senha pode ter no máximo 128 caracteres",
    noUppercase: "A senha deve conter pelo menos uma letra maiúscula",
    noLowercase: "A senha deve conter pelo menos uma letra minúscula",
    noNumber: "A senha deve conter pelo menos um número",
    noSpecialChar:
      "A senha deve conter pelo menos um caractere especial (!@#$%&*...)",
    mismatch: "As senhas não coincidem",
  },
} as const;

/**
 * Validador customizado para nome completo
 */
const validateFullName = (name: string): boolean => {
  const parts = name.trim().split(/\s+/);

  // Deve ter pelo menos 2 partes (nome e sobrenome)
  if (parts.length < 2) return false;

  // Cada parte deve ter pelo menos 2 caracteres
  return parts.every((part) => part.length >= 2);
};

/**
 * Transformador para capitalizar nome
 */
const capitalizeFullName = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      // Preservar preposições em minúsculo (de, da, do, dos, das)
      const prepositions = ["de", "da", "do", "dos", "das", "e"];
      const lowerWord = word.toLowerCase();

      if (prepositions.includes(lowerWord)) {
        return lowerWord;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

/**
 * Schema para dados do usuário (nome e email)
 */
export const signUpUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: ERROR_MESSAGES.name.tooShort })
    .max(100, { message: ERROR_MESSAGES.name.tooLong })
    .refine(validateFullName, {
      message: ERROR_MESSAGES.name.invalid,
    })
    .transform(capitalizeFullName),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255, { message: ERROR_MESSAGES.email.tooLong })
    .email({ message: ERROR_MESSAGES.email.invalid })
    .refine((email) => REGEX_PATTERNS.email.test(email), {
      message: ERROR_MESSAGES.email.invalid,
    }),
});

export type SignUpUserSchema = z.infer<typeof signUpUserSchema>;

/**
 * Schema para senha com validações robustas
 */
export const signUpPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: ERROR_MESSAGES.password.tooShort })
      .max(128, { message: ERROR_MESSAGES.password.tooLong })
      .refine((pwd) => REGEX_PATTERNS.uppercase.test(pwd), {
        message: ERROR_MESSAGES.password.noUppercase,
      })
      .refine((pwd) => REGEX_PATTERNS.lowercase.test(pwd), {
        message: ERROR_MESSAGES.password.noLowercase,
      })
      .refine((pwd) => REGEX_PATTERNS.number.test(pwd), {
        message: ERROR_MESSAGES.password.noNumber,
      })
      .refine((pwd) => REGEX_PATTERNS.specialChar.test(pwd), {
        message: ERROR_MESSAGES.password.noSpecialChar,
      }),

    confirmPassword: z.string().min(1, { message: "Confirme sua senha" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: ERROR_MESSAGES.password.mismatch,
    path: ["confirmPassword"],
  });

export type SignUpPasswordSchema = z.infer<typeof signUpPasswordSchema>;

/**
 * Schema completo para sign up (combinação de user + password)
 */
export const signUpSchema = signUpUserSchema.merge(signUpPasswordSchema);

export type SignUpSchema = z.infer<typeof signUpSchema>;

/**
 * Utilitário para validar força da senha
 */
export const getPasswordStrength = (
  password: string,
): "weak" | "medium" | "strong" => {
  let strength = 0;

  // Comprimento
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (password.length >= 16) strength++;

  // Complexidade
  if (REGEX_PATTERNS.uppercase.test(password)) strength++;
  if (REGEX_PATTERNS.lowercase.test(password)) strength++;
  if (REGEX_PATTERNS.number.test(password)) strength++;
  if (REGEX_PATTERNS.specialChar.test(password)) strength++;

  if (strength <= 3) return "weak";
  if (strength <= 5) return "medium";
  return "strong";
};
