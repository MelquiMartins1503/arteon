"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { ArrowLeft } from "lucide-react";
import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Box } from "@/components/ui/Box";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Form from "@/components/ui/Form";
import Typography from "@/components/ui/Typography";
import apiClient from "@/lib/apiClient";
import {
  type SignUpPasswordSchema,
  type SignUpUserSchema,
  signUpPasswordSchema,
  signUpUserSchema,
} from "@/utils/schemas/signUpSchema";

const Page: NextPage = () => {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  const signUpUserForm = useForm<SignUpUserSchema>({
    resolver: zodResolver(signUpUserSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });
  const {
    formState: { errors: userErrors },
  } = signUpUserForm;

  const signUpPasswordForm = useForm<SignUpPasswordSchema>({
    resolver: zodResolver(signUpPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  const {
    formState: { errors: passwordErrors },
  } = signUpPasswordForm;

  const steps = [
    {
      title: "O primeiro capítulo começa aqui.",
      description:
        "Não deixe a inspiração escapar. Cadastre-se para transformar pensamentos em histórias.",
    },
    {
      title: "Crie Sua Senha",
      description:
        "Um último passo! Defina uma senha forte para proteger sua conta.",
    },
  ];

  const handleNextStep = () => {
    startTransition(async () => {
      try {
        const isValid = await signUpUserForm.trigger();
        if (isValid) setStep((prevStep) => prevStep + 1);
      } catch (err) {
        console.log(err);
      }
    });
  };

  const handlePreviousStep = () => {
    setStep((prevStep) => prevStep - 1);
    signUpPasswordForm.reset();
  };

  const onFinalSubmit = (signUpPasswordSchema: SignUpPasswordSchema) => {
    startTransition(async () => {
      try {
        const isStepValid = await signUpUserForm.trigger();

        if (!isStepValid) {
          setStep(0);
          return;
        }

        const personalInfoData = signUpUserForm.getValues();

        const data = {
          ...signUpPasswordSchema,
          ...personalInfoData,
        };

        await apiClient.post("/auth/sign-up", data);

        setTimeout(() => {
          router.push("/");
        }, 1000);
      } catch (err) {
        if (err instanceof AxiosError) {
          console.error(err.response?.data);
        }
      }
    });
  };

  return (
    <Box className="p-4 w-full h-full">
      <Box className="flex-1 h-full rounded-2xl from-brand-200 bg-linear-to-b to-brand-400 max-[1130px]:hidden">
        a
      </Box>

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
            alignItems="center"
            onSubmit={signUpPasswordForm.handleSubmit(onFinalSubmit)}
          >
            <Form.Header>
              <Form.Header.Title>{steps[step].title}</Form.Header.Title>

              <Form.Header.Description>
                {steps[step].description}
              </Form.Header.Description>

              <Form.Header.StepIndicator
                current={step}
                maxStep={steps.length}
                className="mt-4"
              />
            </Form.Header>

            {step === 0 && (
              <Form.Fieldset legend="Login">
                <Field error={userErrors.name}>
                  <Field.Root>
                    <Form.Group>
                      <Field.Label htmlFor="name">Nome</Field.Label>
                      <Field.ErrorMessage />
                    </Form.Group>

                    <Field.InputWrapper>
                      <Field.Input
                        id="name"
                        {...signUpUserForm.register("name")}
                        placeholder="Digite seu nome e sobrenome"
                      />
                    </Field.InputWrapper>
                  </Field.Root>
                </Field>

                <Field error={userErrors.email}>
                  <Field.Root>
                    <Form.Group>
                      <Field.Label htmlFor="email">E-mail</Field.Label>
                      <Field.ErrorMessage />
                    </Form.Group>

                    <Field.InputWrapper>
                      <Field.Input
                        id="email"
                        {...signUpUserForm.register("email")}
                        placeholder="Digite seu e-mail de acesso"
                      />
                    </Field.InputWrapper>
                  </Field.Root>
                </Field>
              </Form.Fieldset>
            )}

            {step === 1 && (
              <Form.Fieldset legend="Login">
                <Field error={passwordErrors.password}>
                  <Field.Root>
                    <Form.Group>
                      <Field.Label htmlFor="password">Senha</Field.Label>

                      <Field.ErrorMessage />
                    </Form.Group>

                    <Field.InputWrapper>
                      <Field.Input
                        id="password"
                        type="password"
                        placeholder="Digite sua senha"
                        {...signUpPasswordForm.register("password")}
                      />
                      <Field.PasswordToggleButton />
                    </Field.InputWrapper>
                  </Field.Root>
                </Field>

                <Field error={passwordErrors.confirmPassword}>
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
                        placeholder="Confirme sua senha"
                        {...signUpPasswordForm.register("confirmPassword")}
                      />
                      <Field.PasswordToggleButton />
                    </Field.InputWrapper>
                  </Field.Root>
                </Field>
              </Form.Fieldset>
            )}

            <Form.Actions>
              {step === 0 && (
                <Button
                  type="button"
                  width="full"
                  size="lg"
                  onClick={handleNextStep}
                  isLoading={isPending}
                >
                  Continuar
                </Button>
              )}

              {step === 1 && (
                <Button
                  type="submit"
                  width="full"
                  size="lg"
                  isLoading={isPending}
                >
                  Criar Conta e Começar!
                </Button>
              )}
            </Form.Actions>

            <Form.Footer flexDirection="col">
              <Link
                href="/sign-in"
                className="text-brand-700 dark:text-brand-500"
              >
                Já possui uma conta?{" "}
                <Typography
                  as="span"
                  className="text-brand-975 dark:text-brand-50 hover:underline"
                >
                  Fazer Login
                </Typography>
              </Link>
            </Form.Footer>
          </Form>
        </Box>

        {step === 0 && (
          <Typography as="span" className="text-brand-700">
            <Link
              href=""
              className="transition-colors hover:text-brand-975 dark:hover:text-brand-50 hover:underline"
            >
              Política de Privacidade
            </Link>{" "}
            e{" "}
            <Link
              href=""
              className="transition-colors hover:text-brand-975 dark:hover:text-brand-50 hover:underline"
            >
              Termos de Uso
            </Link>
          </Typography>
        )}

        {step === 1 && (
          <Typography as="span" className="text-brand-700">
            Ao se cadastrar, você aceita nossos{" "}
            <Link
              href=""
              className="transition-colors text-brand-975 dark:text-brand-50 hover:underline"
            >
              termos de Uso
            </Link>{" "}
            e a nossa{" "}
            <Link
              href=""
              className="transition-colors text-brand-975 dark:text-brand-50 hover:underline"
            >
              Política de Privacidade
            </Link>
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Page;
