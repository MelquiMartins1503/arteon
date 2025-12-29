"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import type { NextPage } from "next";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import Field from "@/components/Field";
import Form from "@/components/Form";
import { Typography } from "@/components/Typography";
import {
  type ForgotPasswordSchema,
  forgotPasswordSchema,
} from "@/lib/schemas/passwordRecovery";

const maskEmail = (email: string) => {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const maskedUser =
    user.length <= 3
      ? user[0] + "*".repeat(user.length - 1)
      : user[0] + "*".repeat(user.length - 3) + user.slice(-2);
  return `${maskedUser}@${domain}`;
};

const Page: NextPage = () => {
  const [step, setStep] = useState(0);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(30);
  const [isCounting, setIsCounting] = useState(false);

  // Countdown de 30s
  useEffect(() => {
    if (!isCounting) return;

    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          setIsCounting(false);
          return 30; // reset
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCounting]);

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (data: ForgotPasswordSchema) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Erro ao solicitar recuperação.",
          );
        }

        toast.success("E-mail enviado!", {
          description: "Verifique sua caixa de entrada.",
        });

        setSubmittedEmail(data.email);
        setStep((prevStep) => prevStep + 1);
        setIsCounting(true);
      } catch (err) {
        if (err instanceof Error) {
          toast.error("Erro na solicitação", {
            description: err.message,
          });
        }
      }
    });
  };

  const handleResend = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: submittedEmail }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Erro ao reenviar e-mail.");
        }

        toast.success("E-mail reenviado com sucesso!");
        setIsCounting(true); // inicia o contador
      } catch (err) {
        if (err instanceof Error) {
          toast.error("Erro ao reenviar", {
            description: err.message,
          });
        }
      }
    });
  };

  const handlePreviousStep = () => {
    setStep((prevStep) => prevStep - 1);
    setIsCounting(false);
    setResendCooldown(30);
    reset();
  };

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
          {step === 1 && (
            <Button
              variant="outline"
              width="sm"
              className="absolute top-4 left-4 p-0"
              onClick={handlePreviousStep}
            >
              <ArrowLeft size={20} />
            </Button>
          )}

          <Form
            onSubmit={handleSubmit(onSubmit)}
            className="w-[600px]"
            alignItems="center"
          >
            <Form.Header>
              <Form.Header.Title>
                {step === 0
                  ? "Problemas para Acessar?"
                  : "Verifique sua Caixa de Entrada"}
              </Form.Header.Title>

              <Form.Group flexDirection="col" gap={2}>
                {step === 0 && (
                  <Form.Header.Description>
                    Não se preocupe! Digite seu e-mail abaixo e enviaremos
                    imediatamente um link seguro para você criar uma nova senha.
                  </Form.Header.Description>
                )}

                {step === 1 && (
                  <>
                    <Form.Header.Description>
                      Obrigado! Se{" "}
                      <Typography
                        size="xl"
                        weight="medium"
                        className="text-brand-950 dark:text-brand-50"
                      >
                        {maskEmail(submittedEmail)}
                      </Typography>{" "}
                      corresponder a um endereço de e-mail que temos em nossos
                      registros, enviamos um e-mail com instruções adicionais
                      para redefinir sua senha.
                    </Form.Header.Description>
                    <Form.Header.Description>
                      Se você não recebeu um e-mail em 5 minutos, verifique sua
                      pasta de spam, reenvie ou tente um endereço de e-mail
                      diferente.
                    </Form.Header.Description>
                  </>
                )}
              </Form.Group>
            </Form.Header>

            {step === 0 && (
              <Form.Fieldset legend="Login">
                <Field error={errors.email}>
                  <Field.Root>
                    <Form.Group>
                      <Field.Label htmlFor="email">E-mail</Field.Label>
                      <Field.ErrorMessage />
                    </Form.Group>

                    <Field.InputWrapper>
                      <Field.Input
                        id="email"
                        {...register("email")}
                        placeholder="Digite seu e-mail de cadastro"
                      />
                    </Field.InputWrapper>
                  </Field.Root>
                </Field>
              </Form.Fieldset>
            )}

            <Form.Actions>
              {step === 0 && (
                <Button
                  type="submit"
                  width="full"
                  size="lg"
                  isLoading={isPending}
                >
                  Enviar Link de Redefinição
                </Button>
              )}

              {step === 1 && (
                <Button
                  type="button"
                  width="full"
                  size="lg"
                  onClick={handleResend}
                  isLoading={isPending}
                  disabled={isCounting}
                >
                  {isCounting ? `Reenviar (${resendCooldown}s)` : "Reenviar"}
                </Button>
              )}
            </Form.Actions>

            <Form.Footer>
              <Link
                href="/sign-in"
                className="text-brand-600 dark:text-brand-500"
              >
                Lembrou da senha?{" "}
                <Typography
                  as="span"
                  className="transition-all text-brand-950 dark:text-white hover:underline"
                >
                  Fazer Login
                </Typography>
              </Link>
            </Form.Footer>
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
