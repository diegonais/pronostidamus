import { type ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">Vista</p>
        <h2>{title}</h2>
        <p className="page-description">{description}</p>
      </div>
      {actions ? <div className="header-actions">{actions}</div> : null}
    </div>
  );
}

export function StateCard({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'error' | 'warning' | 'success';
}) {
  return <div className={`state-card tone-${tone}`}>{children}</div>;
}

export function StatusBadge({ label, tone }: { label: string; tone: string }) {
  return <span className={`status-badge ${tone}`}>{label}</span>;
}

export function StatTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <article className="stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </article>
  );
}
