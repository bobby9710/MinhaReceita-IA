import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { ChefHat, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm({
    defaultValues: { username: "", password: "" }
  });

  const registerForm = useForm({
    defaultValues: { username: "", password: "", firstName: "", email: "" }
  });

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel - Brand */}
      <div className="hidden md:flex flex-1 bg-primary text-primary-foreground p-12 flex-col justify-center relative overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-12">
            <ChefHat className="w-10 h-10" />
            <span className="font-display font-bold text-3xl">MinhaReceita</span>
          </div>
          <h1 className="text-6xl font-display font-bold leading-tight mb-8">
            Cozinhe com confiança.
          </h1>
          <p className="text-xl opacity-90 leading-relaxed">
            Seu assistente culinário inteligente. Planeje refeições, salve receitas e organize sua cozinha.
          </p>
        </div>
        {/* Abstract background shape */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center gap-2 text-primary mb-8">
            <ChefHat className="w-8 h-8" />
            <span className="font-display font-bold text-xl">MinhaReceita</span>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-display font-bold mb-2">Bem-vindo Chefe!</h2>
            <p className="text-muted-foreground">
              {isRegistering 
                ? "Crie sua conta para começar a organizar suas receitas." 
                : "Faça login para acessar o seu livro de receitas e plano de refeições."}
            </p>
          </div>

          <form 
            onSubmit={isRegistering 
              ? registerForm.handleSubmit((data) => registerMutation.mutate(data))
              : loginForm.handleSubmit((data) => loginMutation.mutate(data))}
            className="space-y-6"
          >
            {isRegistering && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Nome</label>
                <input 
                  {...registerForm.register("firstName")}
                  placeholder="Seu primeiro nome"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none" 
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-semibold">Usuário</label>
              <input 
                {...(isRegistering ? registerForm.register("username") : loginForm.register("username"))}
                placeholder="Digite seu usuário"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none" 
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Senha</label>
              <input 
                type="password"
                {...(isRegistering ? registerForm.register("password") : loginForm.register("password"))}
                placeholder="Digite sua senha"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none" 
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loginMutation.isPending || registerMutation.isPending}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              {(loginMutation.isPending || registerMutation.isPending) && <Loader2 className="w-5 h-5 animate-spin" />}
              {isRegistering ? "Criar Conta" : "Entrar"}
            </button>
          </form>

          <div className="mt-8 flex justify-between items-center text-sm font-medium">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-primary hover:underline"
            >
              {isRegistering ? "Já tenho uma conta" : "Cadastrar"}
            </button>
            <button 
              type="button"
              onClick={() => {
                const username = loginForm.getValues("username") || registerForm.getValues("username");
                if (!username) {
                  toast({
                    title: "Atenção",
                    description: "Por favor, digite seu nome de usuário para redefinir a senha.",
                    variant: "destructive"
                  });
                  return;
                }
                toast({
                  title: "Redefinição de Senha",
                  description: "Um link de redefinição foi enviado para o seu e-mail cadastrado (Simulação).",
                });
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Redefinir senha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
