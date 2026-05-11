import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage(
  props: PageProps<"/admin/login">,
) {
  const sp = await props.searchParams;
  const from = typeof sp.from === "string" ? sp.from : "/admin/readings";
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Restricted area.
      </p>
      <div className="mt-8">
        <LoginForm from={from} />
      </div>
    </div>
  );
}
