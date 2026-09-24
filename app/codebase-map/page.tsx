"use client";

import React from "react";

const operationalAreas = [
  {
    title: "Order Management",
    icon: "📋",
    description: "The central workflow board for every item.",
    tags: ["search", "drag & drop", "due dates"],
    accent: "blue",
  },
  {
    title: "Production Planning",
    icon: "🗓️",
    description: "Schedules orders across the week using capacity and due dates.",
    tags: ["weekly calendar", "auto-plan", "forecast"],
    accent: "violet",
  },
  {
    title: "Shipping",
    icon: "📦",
    description: "Rates, labels, tracking, PDFs, and pickup status.",
    tags: ["FedEx", "EasyPost", "ShipStation"],
    accent: "orange",
  },
  {
    title: "Persistence & APIs",
    icon: "🗄️",
    description: "Orders, schedules, activities, snapshots, labels, and tracking records.",
    tags: ["MongoDB", "AWS S3", "webhooks"],
    accent: "slate",
  },
  {
    title: "Operations Analytics",
    icon: "📈",
    description: "Backlog, debt, health, throughput, delivery, WIP, and trends.",
    tags: ["snapshots", "metrics", "forecasting"],
    accent: "emerald",
  },
  {
    title: "Utilities",
    icon: "🛠️",
    description: "Print templates, due reports, setup calculator, and local dashboard.",
    tags: ["printing", "calculator", "ESP32"],
    accent: "amber",
  },
  {
    title: "External Services",
    icon: "🔌",
    description: "Carriers, storage, Etsy access, and operational alerts.",
    tags: ["Etsy", "ZeptoMail", "S3"],
    accent: "pink",
  },
] as const;

function AreaCard({
  title,
  icon,
  description,
  tags,
  accent,
}: (typeof operationalAreas)[number]) {
  return (
    <section className={`map-card map-card-${accent}`}>
      <h2>
        <span aria-hidden="true">{icon}</span> {title}
      </h2>
      <p>{description}</p>
      <div className="map-tags">
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </section>
  );
}

export default function CodebaseMapPage() {
  return (
    <div className="map-page">
      <style jsx>{`
        .map-page {
          min-height: 100%;
          padding: 2rem clamp(1rem, 4vw, 3.5rem) 3.5rem;
          color: #f8fafc;
          background: radial-gradient(circle at 50% 0%, #23314d 0%, #111827 46%, #0b1120 100%);
        }
        .map-header {
          max-width: 72rem;
          margin: 0 auto 1.5rem;
        }
        .map-kicker {
          margin: 0 0 .45rem;
          color: #7dd3fc;
          font-size: .68rem;
          font-weight: 800;
          letter-spacing: .18em;
          text-transform: uppercase;
        }
        .map-header h1 {
          margin: 0;
          font-size: clamp(1.7rem, 3vw, 2.65rem);
          letter-spacing: -.045em;
        }
        .map-header p {
          max-width: 42rem;
          margin: .7rem 0 0;
          color: #9caec8;
          font-size: .92rem;
        }
        .map-canvas {
          position: relative;
          max-width: 72rem;
          min-height: 39rem;
          margin: 0 auto;
          overflow: hidden;
          border: 1px solid #33445f;
          border-radius: 1.25rem;
          background-image: linear-gradient(#ffffff06 1px, transparent 1px), linear-gradient(90deg, #ffffff06 1px, transparent 1px);
          background-size: 1.75rem 1.75rem;
          box-shadow: 0 2rem 5rem #00000038;
        }
        .map-canvas::before,
        .map-canvas::after {
          position: absolute;
          content: "";
          pointer-events: none;
          border-radius: 999px;
          filter: blur(1px);
        }
        .map-canvas::before {
          width: 22rem;
          height: 22rem;
          top: 11rem;
          left: calc(50% - 11rem);
          background: #2563eb16;
        }
        .map-canvas::after {
          width: 15rem;
          height: 15rem;
          right: -5rem;
          bottom: -6rem;
          background: #db277715;
        }
        .map-layout {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          grid-template-rows: auto auto auto;
          gap: 1.2rem;
          align-items: center;
          padding: 2rem;
        }
        .map-card {
          min-height: 8rem;
          padding: 1rem;
          border: 1px solid #40516c;
          border-top: 3px solid #64748b;
          border-radius: .9rem;
          background: #172033e8;
          box-shadow: 0 .8rem 1.7rem #00000025;
          backdrop-filter: blur(8px);
        }
        .map-card h2 {
          margin: 0;
          color: #f8fafc;
          font-size: .88rem;
          letter-spacing: -.02em;
        }
        .map-card h2 span { margin-right: .2rem; }
        .map-card p {
          min-height: 2.35rem;
          margin: .5rem 0 .65rem;
          color: #a8b6cb;
          font-size: .7rem;
          line-height: 1.45;
        }
        .map-tags { display: flex; flex-wrap: wrap; gap: .3rem; }
        .map-tags span {
          padding: .22rem .42rem;
          border: 1px solid #52627b;
          border-radius: 999px;
          color: #c7d2e2;
          font-size: .6rem;
        }
        .map-card-blue { border-top-color: #60a5fa; }
        .map-card-violet { border-top-color: #a78bfa; }
        .map-card-orange { border-top-color: #fb923c; }
        .map-card-slate { border-top-color: #94a3b8; }
        .map-card-emerald { border-top-color: #34d399; }
        .map-card-amber { border-top-color: #fbbf24; }
        .map-card-pink { border-top-color: #f472b6; }
        .map-core {
          display: grid;
          place-items: center;
          min-height: 10rem;
          padding: 1.5rem;
          border: 1px solid #60a5fa88;
          border-radius: 1rem;
          background: linear-gradient(145deg, #1e3a5f, #172033);
          box-shadow: 0 1.2rem 2.5rem #00000048, inset 0 1px #ffffff18;
          text-align: center;
        }
        .map-core h2 { margin: 0; font-size: 1.22rem; letter-spacing: -.04em; }
        .map-core p { margin: .45rem 0 0; color: #bfdbfe; font-size: .7rem; }
        .map-layout > :nth-child(1) { grid-column: 1; grid-row: 1; }
        .map-layout > :nth-child(2) { grid-column: 2; grid-row: 1 / span 2; }
        .map-layout > :nth-child(3) { grid-column: 3; grid-row: 1; }
        .map-layout > :nth-child(4) { grid-column: 1; grid-row: 2; }
        .map-layout > :nth-child(5) { grid-column: 2; grid-row: 3; }
        .map-layout > :nth-child(6) { grid-column: 3; grid-row: 2; }
        .map-layout > :nth-child(7) { grid-column: 1 / span 3; grid-row: 4; }
        .map-footer { max-width: 72rem; margin: 1rem auto 0; color: #71829c; font-size: .68rem; text-align: center; }
        @media (max-width: 800px) {
          .map-layout { grid-template-columns: 1fr; grid-template-rows: auto; padding: 1rem; }
          .map-layout > :nth-child(n) { grid-column: 1; grid-row: auto; }
          .map-canvas { min-height: 0; }
          .map-card p { min-height: 0; }
        }
      `}</style>

      <header className="map-header">
        <p className="map-kicker">Codebase architecture</p>
        <h1>Tuesday / Everwood operations platform</h1>
        <p>Customer order → production → shipment → operational insight</p>
      </header>

      <main className="map-canvas" aria-label="Visual map of the codebase">
        <div className="map-layout">
          <AreaCard {...operationalAreas[0]} />
          <div className="map-core">
            <div>
              <h2>Next.js application</h2>
              <p>React UI · API routes · Zustand stores</p>
            </div>
          </div>
          <AreaCard {...operationalAreas[1]} />
          <AreaCard {...operationalAreas[2]} />
          <AreaCard {...operationalAreas[3]} />
          <AreaCard {...operationalAreas[4]} />
          <AreaCard {...operationalAreas[5]} />
          <AreaCard {...operationalAreas[6]} />
        </div>
      </main>

      <p className="map-footer">The application coordinates the workflow; MongoDB, S3, carriers, and messaging services support it.</p>
    </div>
  );
}
