import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../../auth";

export default async function AuthRedirectPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.onboardingComplete) {
    redirect("/dashboard");
  }

  redirect("/onboarding");
}
