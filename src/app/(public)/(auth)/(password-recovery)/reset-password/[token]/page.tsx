"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import type { NextPage } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import Field from "@/components/Field";
import Form from "@/components/Form";
import { Typography } from "@/components/Typography";
import {
  type ResetPasswordSchema,
  resetPasswordSchema,
} from "@/lib/schemas/passwordRecovery";

const Page: NextPage = () => {
  const router = useRouter();
  const params = useParams<{ token: string }>();

  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: ResetPasswordSchema) => {
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/auth/reset-password/${params.token}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Erro ao redefinir a senha.");
        }

        setStep((prevStep) => prevStep + 1);
        toast.success("Senha redefinida com sucesso!", {
          description: "Você será redirecionado para o login.",
        });

        setTimeout(() => {
          router.push("/sign-in");
        }, 2000);
      } catch (err) {
        if (err instanceof Error) {
          toast.error("Erro na redefinição", {
            description: err.message,
          });
        } else {
          toast.error("Erro desconhecido", {
            description: "Tente novamente mais tarde.",
          });
        }
      }
    });
  };

  const steps = [
    {
      title: "Criar Nova Senha",
      description:
        "Digite e confirme sua nova senha. Lembre-se: uma senha forte garante sua segurança.",
    },
    {
      title: "Senha atualizada",
      description:
        "Tudo pronto. Você já pode acessar sua conta utilizando suas novas credenciais de segurança.",
    },
  ];

  return (
    <Box className="p-4 w-full h-full">
      <Box
        as="main"
        flexDirection="col"
        alignItems="center"
        justifyContent="between"
        className="flex-1 h-full"
      >
        <Box
          alignItems="center"
          flexDirection="col"
          justifyContent="center"
          className="relative w-full h-full"
        >
          <Form alignItems="center" onSubmit={handleSubmit(onSubmit)}>
            <Form.Header alignItems="center">
              {step === 1 && (
                <Box
                  alignItems="center"
                  justifyContent="center"
                  className="mb-8 w-28 h-28 text-white rounded-full bg-green-500/40 outline-16 outline-green-500/25"
                >
                  <ShieldCheck size={64} />
                </Box>
              )}

              <Form.Header.Title
                align={step === 1 ? "center" : "left"}
                className="w-full"
              >
                {steps[step]?.title ?? ""}
              </Form.Header.Title>

              <Form.Header.Description align={step === 1 ? "center" : "left"}>
                {steps[step]?.description ?? ""}
              </Form.Header.Description>
            </Form.Header>

            {step === 0 && (
              <Form.Fieldset legend="Reset Password">
                <Field error={errors.password}>
                  <Field.Root>
                    <Form.Group>
                      <Field.Label htmlFor="password">Nova Senha</Field.Label>

                      <Field.ErrorMessage />
                    </Form.Group>

                    <Field.InputWrapper>
                      <Field.Input
                        id="password"
                        type="password"
                        placeholder="Digite sua senha"
                        {...register("password")}
                      />
                      <Field.PasswordToggleButton />
                    </Field.InputWrapper>
                  </Field.Root>
                </Field>

                <Field error={errors.confirmPassword}>
                  <Field.Root>
                    <Form.Group>
                      <Field.Label htmlFor="confirmPassword">
                        Confirme sua senha
                      </Field.Label>
                      <Field.ErrorMessage />
                    </Form.Group>

                    <Field.InputWrapper>
                      <Field.Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirme a Nova Senha"
                        {...register("confirmPassword")}
                      />
                      <Field.PasswordToggleButton />
                    </Field.InputWrapper>
                  </Field.Root>
                </Field>
              </Form.Fieldset>
            )}

            {step === 0 && (
              <Button
                type="submit"
                width="full"
                size="lg"
                isLoading={isPending}
              >
                Redefinir Senha
              </Button>
            )}

            {step === 0 && (
              <Form.Footer flexDirection="col">
                <Link
                  href="/sign-in"
                  className="text-brand-600 dark:text-brand-500"
                >
                  Já possui uma conta?{" "}
                  <Typography
                    as="span"
                    className="transition-all text-brand-950 dark:text-white hover:underline"
                  >
                    Fazer Login
                  </Typography>
                </Link>
              </Form.Footer>
            )}
          </Form>
        </Box>

        <Typography as="span" className="text-brand-700 dark:text-brand-400">
          <Link
            href=""
            className="transition-colors hover:text-brand-950 dark:hover:text-white hover:underline"
          >
            Política de Privacidade
          </Link>{" "}
          e{" "}
          <Link
            href=""
            className="transition-colors hover:text-brand-950 dark:hover:text-white hover:underline"
          >
            Termos de Uso
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Page;
