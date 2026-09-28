// The Monaco build the editor loads from the CDN at runtime. It must match the
// `monaco-editor` devDependency, which only supplies the types (production
// installs keep it anyway, as a peer of @monaco-editor/react):
// @monaco-editor/react's own default CDN path lags behind, and an API the
// types promise but the runtime lacks fails silently. monaco.test.ts guards
// the two against drifting.
export const MONACO_VERSION = "0.57.0";

export const MONACO_CDN_PATH = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;
