# Third-party notices

UI source under src/components, the shared UI utility, and the theme originate from [shadcn/ui](https://github.com/shadcn-ui/ui), installed with its official CLI. The acquisition record and hashes are in docs/ui-provenance.json. Source was relocated/import-rewritten by the CLI; the model did not author these components.

The following license applies to vendored shadcn source:

MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Other installed packages retain their licenses in their distributions. The framework shell was generated with create-next-app.

ReEntry additionally uses WXT (MIT), Dexie (Apache-2.0), jsdiff (BSD-3-Clause), and @axe-core/playwright (MPL-2.0); their license files remain in package distributions. Geist is wired through the official shadcn font registry and Next font loader. The extension uses the standard system sans-serif fallback.

The fictional Northstar presentation sandbox reuses the installed shadcn registry components, React, lucide-react icons and theme. Vite 8.3.4 (MIT, already used by WXT and now directly pinned) builds its static pages; http-server (MIT) hosts them locally. The portal copy, layout composition, sample applicant and draft/scenario behavior are original ReEntry demo work, not a forked scholarship service. No external images, fonts, real documents or third-party portal brand assets are used.

NVIDIA Nemotron 3 Ultra weights are governed by OpenMDW-1.1 according to the [official model card](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b/modelcard); NVIDIA's hosted trial service has separate API trial terms. ReEntry does not redistribute those weights or the proprietary NIM runtime. Local Ollama/Qwen setup retains its own upstream terms. See docs/PROVENANCE.md and docs/NVIDIA.md.
