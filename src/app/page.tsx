import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../auth";
import { DashboardPage } from "../features/DashboardPage";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <DashboardPage />;
}
