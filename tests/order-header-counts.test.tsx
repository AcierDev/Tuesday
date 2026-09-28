import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { useOrderStats } from "../hooks/useOrderStats";
import { ItemSizes, ItemStatus, type Item } from "../typings/types";

function HeaderCounts({ items }: { items: Item[] }) {
  const counts = useOrderStats({ items });
  return <output data-all={counts.all} data-geometric={counts.geometric} data-striped={counts.striped} data-mini={counts.mini} />;
}

test("header type badges count New, On Deck, and WIP orders regardless of due date", () => {
  const items = [
    { id: "new", status: ItemStatus.New, design: "Geometric", size: "10x10" },
    { id: "deck", status: ItemStatus.OnDeck, design: "Striped Blue", size: "10x10", dueDate: "2099-01-01" },
    { id: "wip", status: ItemStatus.Wip, design: "Geometric", size: ItemSizes.Fourteen_By_Seven },
    { id: "pack", status: ItemStatus.Packaging, design: "Geometric", size: "10x10", dueDate: "2099-01-01" },
  ] as Item[];

  const markup = renderToStaticMarkup(<HeaderCounts items={items} />);
  assert.match(markup, /data-all="3"/);
  assert.match(markup, /data-geometric="1"/);
  assert.match(markup, /data-striped="1"/);
  assert.match(markup, /data-mini="1"/);
});
