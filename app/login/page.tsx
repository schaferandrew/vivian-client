import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { LoginFormSkeleton } from "./login-form-skeleton";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
