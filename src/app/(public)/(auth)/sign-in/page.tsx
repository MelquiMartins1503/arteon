"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import Field from "@/components/Field";
import Form from "@/components/Form";
import { Typography } from "@/components/Typography";
import { type SignInSchema, signInSchema } from "@/lib/schemas/signInSchema";

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
        const response = await fetch("/api/auth/sign-in", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Erro ao fazer login.");
        }

        toast.success("Login realizado com sucesso!", {
          description: "Redirecionando para o dashboard...",
        });

        // Aguarda um momento para o usuário ver o toast antes de redirecionar
        // e atualiza os componentes do servidor (como estado de auth no layout)
        router.refresh();

        setTimeout(() => {
          router.push("/");
        }, 1000);
      } catch (err) {
        if (err instanceof Error) {
          toast.error("Erro ao entrar", {
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
                          className="transition-colors text-brand-600 dark:text-brand-400 dark:hover:text-white hover:text-brand-950 hover:underline"
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
                  className="text-brand-600 dark:text-brand-500"
                >
                  Novo por aqui?{" "}
                  <Typography
                    as="span"
                    className="transition-all text-brand-950 dark:text-white hover:underline"
                  >
                    Crie sua conta gratuitamente
                  </Typography>
                </Link>
              </Form.Footer>
            </Form>
          </Box>
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
