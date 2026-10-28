/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
declare module 'xlsx/dist/cpexcel.full.mjs' {
  export const utils: { decode(codepage: number, data: Uint8Array): string }
}
