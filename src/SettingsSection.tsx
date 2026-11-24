import type { ReactNode } from "react";
export function SettingsSection({
  title,
  children,
  columns = 1,
}: {
  title: string;
  children: ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <section className="settings-section">
      <h3>{title}</h3>
      <div
        className={`settings-grid ${columns === 2 ? "settings-grid-two" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}
