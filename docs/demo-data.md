# Demo data

Demo data fills a new store with sample products so you can see how it looks before adding your own.

## Install

- In the **setup wizard**, tick *Add demo products* on the last step, or
- **Admin → Store type & demo → Install demo** (uses your current shop type; can be run again for more).

It adds, for the current shop type:

- the type’s categories (only the ones you don’t already have),
- about 24–28 products with prices, sale prices, stock and featured / new / bestseller flags,
- 3 customer reviews for the homepage.

Demo pictures are drawn on the fly from the category emoji (`/demo-images/…svg`), so they work on every host with no storage set up. Every demo product says *“This is a demo product”* in its description and has a SKU starting with `DEMO-`.

## Remove

**Admin → Store type & demo → Remove all demo data** deletes:

- every product the demo created, and any product whose SKU starts with `DEMO` (e.g. from a demo CSV),
- the demo reviews,
- demo categories, but only if nothing else is in them.

Your own products, categories, orders and customers are never touched. If a demo product was already ordered, it is hidden (archived) instead of deleted so the order keeps its line.

## How it works

Rows created by the demo are recorded in the `DemoItem` table (`model`, `recordId`). Removal deletes exactly those rows. Code: [`src/lib/demo-data.ts`](../src/lib/demo-data.ts).
