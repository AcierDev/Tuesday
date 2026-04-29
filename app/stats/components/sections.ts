export const SECTIONS = [
  { group: "Snapshot", items: [
    { href: "/stats/overview", label: "Overview" },
    { href: "/stats/today", label: "Today" },
    { href: "/stats/glued", label: "Glued" },
  ]},
  { group: "Operations", items: [
    { href: "/stats/debt", label: "Time Debt" },
    { href: "/stats/backlog", label: "Backlog" },
    { href: "/stats/wip", label: "WIP & Aging" },
    { href: "/stats/bottlenecks", label: "Bottlenecks" },
    { href: "/stats/anomalies", label: "Anomalies" },
    { href: "/stats/quality", label: "Quality" },
    { href: "/stats/activity", label: "Activity Feed" },
  ]},
  { group: "Throughput", items: [
    { href: "/stats/throughput", label: "Throughput" },
    { href: "/stats/lead-time", label: "Lead Time" },
    { href: "/stats/on-time", label: "On-Time" },
    { href: "/stats/calendar", label: "Activity Calendar" },
    { href: "/stats/day-patterns", label: "Day Patterns" },
  ]},
  { group: "Trends", items: [
    { href: "/stats/year-over-year", label: "Year-over-Year" },
    { href: "/stats/records", label: "Records" },
    { href: "/stats/forecast", label: "Forecast" },
    { href: "/stats/goals", label: "Goals" },
  ]},
  { group: "Catalog", items: [
    { href: "/stats/mix", label: "Mix" },
    { href: "/stats/trending", label: "Trending Designs" },
  ]},
  { group: "Shipping", items: [
    { href: "/stats/shipping", label: "Shipping Spend" },
    { href: "/stats/delivery", label: "Delivery Speed" },
    { href: "/stats/map", label: "Map" },
  ]},
] as const;
