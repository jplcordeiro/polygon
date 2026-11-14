import { Font } from "@react-pdf/renderer";
import next400 from "@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-400-normal.woff?url";
import next600 from "@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-600-normal.woff?url";
import next700 from "@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-700-normal.woff?url";
import next400italico from "@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-400-italic.woff?url";
import mono400 from "@fontsource/atkinson-hyperlegible-mono/files/atkinson-hyperlegible-mono-latin-400-normal.woff?url";

export const SANS = "Atkinson";
export const MONO = "Atkinson Mono";

let registradas = false;

export function registrarFontes() {
  if (registradas) return;
  registradas = true;

  Font.register({
    family: SANS,
    fonts: [
      { src: next400, fontWeight: 400 },
      { src: next600, fontWeight: 600 },
      { src: next700, fontWeight: 700 },
      { src: next400italico, fontWeight: 400, fontStyle: "italic" },
    ],
  });
  Font.register({ family: MONO, fonts: [{ src: mono400, fontWeight: 400 }] });
  Font.registerHyphenationCallback((palavra) => [palavra]);
}
