import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";
import { SuiteProvider } from "./context/SuiteContext";
import { DashboardPage } from "./pages/DashboardPage";
import { FinancePage } from "./pages/FinancePage";
import { SetupPage } from "./pages/SetupPage";
import { ShoppingPage } from "./pages/ShoppingPage";
import { TasksPage } from "./pages/TasksPage";

export default function App() {
  return (
    <SuiteProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/shopping" element={<ShoppingPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/setup" element={<SetupPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SuiteProvider>
  );
}
