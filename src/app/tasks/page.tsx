import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../auth";
import { TasksPage } from "../../features/TasksPage";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <TasksPage
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        suiteId: session.user.suiteId,
      }}
    />
  );
}
