import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold text-center mb-6">
          Create your account
        </h1>
        <SignupForm />
      </div>
    </main>
  );
}
