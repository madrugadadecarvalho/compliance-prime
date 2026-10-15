import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const buttonVariants = {
  primary: "bg-primary text-on-primary hover:shadow-elevation-1 hover:brightness-110 focus-visible:outline-primary",
  secondary:
    "bg-surface text-primary ring-1 ring-inset ring-outline hover:bg-primary-container/40 focus-visible:outline-primary",
  danger: "bg-danger text-on-danger hover:shadow-elevation-1 hover:brightness-110 focus-visible:outline-danger",
  success: "bg-success text-on-success hover:shadow-elevation-1 hover:brightness-110 focus-visible:outline-success",
  ghost: "text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus-visible:outline-primary",
} as const;

type Variant = keyof typeof buttonVariants;

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-2xl border border-outline-variant bg-surface shadow-elevation-1", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  actions,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant px-5 py-4">
      <div>
        <h2 id={id} className="text-base font-medium text-on-surface">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

const tones = {
  slate: "bg-surface-container text-on-surface-variant ring-transparent",
  blue: "bg-primary-container text-on-primary-container ring-transparent",
  amber: "bg-amber-100 text-amber-900 ring-transparent",
  green: "bg-emerald-100 text-emerald-900 ring-transparent",
  red: "bg-red-100 text-red-900 ring-transparent",
  violet: "bg-violet-100 text-violet-900 ring-transparent",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-sm text-on-surface-variant">{eyebrow}</div>}
        <h1 className="text-[1.75rem] font-normal leading-tight tracking-tight text-on-surface">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({
  tone = "blue",
  title,
  children,
}: {
  tone?: "blue" | "amber" | "red" | "green";
  title?: ReactNode;
  children?: ReactNode;
}) {
  const map = {
    blue: "border-transparent bg-primary-container/70 text-on-primary-container",
    amber: "border-transparent bg-amber-100 text-amber-950",
    red: "border-transparent bg-red-100 text-red-950",
    green: "border-transparent bg-emerald-100 text-emerald-950",
  };
  return (
    <div role={tone === "red" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", map[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : undefined}>{children}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-outline px-4 py-8 text-center">
      <p className="text-sm font-medium text-on-surface">{title}</p>
      {children && <div className="mt-1 text-sm text-on-surface-variant">{children}</div>}
    </div>
  );
}

export function DescriptionList({ items }: { items: { label: string; value: ReactNode; wide?: boolean }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className={cn(item.wide && "sm:col-span-2 lg:col-span-3")}>
          <dt className="text-xs text-on-surface-variant">{item.label}</dt>
          <dd className="mt-1 break-words text-sm text-on-surface">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export const inputClass =
  "block w-full rounded-lg border-0 bg-surface px-3 py-2 text-sm text-on-surface ring-1 ring-inset ring-outline placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary aria-[invalid=true]:ring-danger disabled:bg-surface-container disabled:text-on-surface-variant";

export function Field({
  label,
  name,
  id,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name: string;
  id?: string;
  error?: string[];
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id ?? name} className="block text-sm font-medium text-on-surface">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !error?.length && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
      {error?.length ? (
        <p id={`${id ?? name}-error`} className="mt-1 text-xs font-medium text-danger">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-outline-variant text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn("whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-on-surface-variant", className)}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top text-on-surface", className)}>{children}</td>;
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-AO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Africa/Luanda",
  }).format(new Date(d));
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-AO", { dateStyle: "medium", timeZone: "Africa/Luanda" }).format(new Date(d));
}

export function formatMoney(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }).format(
    Number(v),
  );
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
