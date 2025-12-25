"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Box } from "@/components/ui/Box";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Form from "@/components/ui/Form";
import Typography from "@/components/ui/Typography";
import apiClient from "@/lib/apiClient";
import { type SignInSchema, signInSchema } from "@/utils/schemas/signInSchema";

const Page: NextPage = () => {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: SignInSchema) => {
    startTransition(async () => {
      try {
        await apiClient.post("/auth/sign-in", data);

        setTimeout(() => {
          router.push("/");
          console.log("redirected");
        }, 1000);
      } catch (err) {
        if (err instanceof AxiosError)
          /* eslint-disable */ console.error(
            "Login error:",
            err.message,
            err.response?.data,
          );
      }
    });
  };

  return (
    <Box className="p-4 w-full h-full">
      <Box
        flexDirection="col"
        alignItems="center"
        justifyContent="between"
        className="flex-1 h-full"
      >
        <Box
          as="main"
          flexDirection="col"
          alignItems="center"
          justifyContent="between"
          className="flex-1 h-full"
        >
          <Box
            alignItems="center"
            justifyContent="center"
            className="w-full h-full"
          >
            <Form onSubmit={handleSubmit(onSubmit)} alignItems="center">
              <Form.Header>
                <Form.Header.Title>Bem-vindo de volta!</Form.Header.Title>

                <Form.Header.Description>
                  A fronteira entre o que você imagina e o que você escreve
                  deixa de existir aqui. Vamos expandir sua obra?
                </Form.Header.Description>
              </Form.Header>

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
                        placeholder="Digite seu e-mail de acesso"
                      />
                    </Field.InputWrapper>
                  </Field.Root>
                </Field>

                <Field error={errors.password}>
                  <Field.Root>
                    <Form.Group>
                      <Field.Label htmlFor="password">Senha</Field.Label>

                      <Box>
                        <Field.ErrorMessage />
                        <Link
                          href="/forgot-password"
                          className="transition-colors text-brand-700 dark:text-brand-500 dark:hover:text-brand-200 hover:text-brand-975 hover:underline"
                        >
                          Esqueceu a senha?
                        </Link>
                      </Box>
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
              </Form.Fieldset>

              <Form.Actions>
                <Button
                  type="submit"
                  width="full"
                  size="lg"
                  isLoading={isPending}
                >
                  Continuar a história
                </Button>
              </Form.Actions>

              <Form.Footer>
                <Link
                  href="/sign-up"
                  className="text-brand-700 dark:text-brand-500"
                >
                  Novo por aqui?{" "}
                  <Typography
                    as="span"
                    className="text-brand-975 dark:text-brand-50 hover:underline"
                  >
                    Crie sua conta gratuitamente
                  </Typography>
                </Link>
              </Form.Footer>
            </Form>
          </Box>
        </Box>

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
      </Box>

      <Box className="flex-1 h-full rounded-2xl from-brand-200 bg-linear-to-b to-brand-400 max-[1130px]:hidden">
        a
      </Box>
    </Box>
  );
};

export default Page;
