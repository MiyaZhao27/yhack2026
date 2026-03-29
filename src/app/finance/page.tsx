import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../auth";
import { FinancePage } from "../../features/FinancePage";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <FinancePage />;
}
