import { ReactNode } from "react";

/** Recebe uma key nova a cada navegação, então cada página entra com um fade curto. */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
