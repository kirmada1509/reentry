# UI policy: choose and wire standard components

The default is shadcn/ui, installed with the pinned CLI. Spend design effort selecting the right screen, component, copy, states, and interaction; do not generate a design system.

## Workflow

1. Plan the user journey in docs/PRODUCT.md.
2. Look for an official shadcn block or example first.
3. Run pnpm ui:add <registry-name> for missing components or blocks.
4. Compose installed components in framework pages/layouts and bind actual data/actions.
5. Use shipped variants and defaults. Verify keyboard order, labels, error text, focus restoration, and the narrow viewport.

Installed basics include buttons, inputs, labels, cards, badges, alerts, dialogs, selects, textareas, tables, tabs, skeletons, separators, empty states, and toast support. Toast rendering still needs its standard provider placed by the product when used.

The initial home page re-exports the official empty-demo example. Its create/import buttons are upstream demonstration controls, not implemented product features. Replace the example with the selected product flow before presenting a product demo.

## Enforcement

docs/ui-provenance.json hashes registry-generated assets. pnpm ui:check rejects changed vendor assets, unregistered components, additional style sheets, raw interactive HTML outside registry code, and non-layout styling in framework entry files. Hooks and CI run the guard.

pnpm ui:add verifies the existing baseline, invokes the CLI, and records the resulting assets. Existing items are reinstalled from upstream; review the diff before committing. Do not edit the manifest to bless handwritten UI.

Static `min-w-0` and `wrap-anywhere` layout utilities are allowed to contain long task text and URLs at narrow widths; they do not replace registry-owned appearance.

Framework root layout and page composition remain necessary. Semantic layout tags and a limited set of static layout utilities are allowed. The check is a practical repository policy, not a proof that arbitrary JavaScript cannot create UI.

For another open-source UI library, establish its source/license and update the adoption script and guard deliberately. The current automation supports the official shadcn registry. A new user requirement can change this preference; do not silently manufacture a replacement component.

Font registry items may update framework font wiring. The adoption script formats that application layout and records the acquisition without treating the whole layout as immutable vendor code. Vendored components/theme/utilities keep their hashes. The web root supplies the registry's `--font-sans` through Next/Geist; the extension entry supplies the standard system-font fallback because it has no Next font loader.
