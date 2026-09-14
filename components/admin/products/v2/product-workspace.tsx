"use client";

import type { ReactNode } from "react";

type ProductWorkspaceProps = {
  actionBar: ReactNode;
  children: ReactNode;
  sidebar: ReactNode;
};

type ProductCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

type ProductSidebarCardProps = {
  title: string;
  children: ReactNode;
};

export function ProductWorkspace({
  actionBar,
  children,
  sidebar,
}: ProductWorkspaceProps) {
  return (
    <div
      className="st-admin-product-workspace"
      data-admin-product-workspace="true"
    >
      {actionBar}

      <div className="st-admin-product-workspace__layout">
        <main className="st-admin-product-workspace__main">
          {children}
        </main>

        <aside className="st-admin-product-workspace__sidebar">
          {sidebar}
        </aside>
      </div>
    </div>
  );
}

export function ProductCard({
  title,
  description,
  children,
}: ProductCardProps) {
  return (
    <section className="st-admin-product-card">
      <header className="st-admin-product-card__header">
        <h2>{title}</h2>

        {description ? <p>{description}</p> : null}
      </header>

      <div className="st-admin-product-card__body">
        {children}
      </div>
    </section>
  );
}

export function ProductSidebarCard({
  title,
  children,
}: ProductSidebarCardProps) {
  return (
    <section className="st-admin-product-sidebar-card">
      <header className="st-admin-product-sidebar-card__header">
        <h3>{title}</h3>
      </header>

      <div className="st-admin-product-sidebar-card__body">
        {children}
      </div>
    </section>
  );
}
