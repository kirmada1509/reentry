import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import {
  appOriginSchema,
  DEFAULT_APP_ORIGIN,
} from "../src/features/capture/config";

const appOrigin = appOriginSchema.parse(
  process.env.REENTRY_APP_ORIGIN || DEFAULT_APP_ORIGIN,
);

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  imports: false,
  alias: { "@reentry": fileURLToPath(new URL("../src", import.meta.url)) },
  vite: () => ({
    plugins: [tailwindcss()],
    define: { __REENTRY_APP_ORIGIN__: JSON.stringify(appOrigin) },
  }),
  manifest: {
    name: "ReEntry — capture selected instructions",
    version: "0.1.0",
    description:
      "Review selected instruction text and save your place in ReEntry.",
    key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArxPPVPjfnp8Y7qObKTVa4VfqW0pbGwA1zd7mTu+K+v+1KWBSGk6rGxvBo42PVngEJG/9jUe3XqYOwEQRwX6Xp5HCciq90aOwy15/YovRWa1Oe7NUFFnqkb0X2GlcHvwwKNG3em0NeVM4vd26KT/r/bqPjAQQYcp1jiYB5vbxkpjAD27ffAepsuN419dp5CEv5J9RxWsVVHrk1NEcUaKVKbKgP3L6J5+/3bSLKtJXNqFsXIV/kafdeEY3OE4/+jaOJholZYVXUyZAk1a+DyJA+to9+zCFLeiC0AV2hN8dnDClipefy85yd2IhR2khpHGWS3lncvAIPckUsutsYEmpXwIDAQAB",
    permissions: ["activeTab", "scripting", "storage"],
    action: { default_title: "Capture selection with ReEntry" },
    commands: {
      _execute_action: {
        suggested_key: { default: "Ctrl+Shift+Y", mac: "Command+Shift+Y" },
        description: "Capture selected instruction text",
      },
    },
    externally_connectable: {
      matches: [
        `${new URL(appOrigin).protocol}//${new URL(appOrigin).hostname}/*`,
      ],
    },
  },
});
