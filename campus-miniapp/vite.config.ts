import { defineConfig } from 'vite'
import uniModule from '@dcloudio/vite-plugin-uni'

// uni 插件当前以 CommonJS 分发；ESM 项目下可能多包一层 default。
const uni = (uniModule as unknown as { default?: typeof uniModule }).default ?? uniModule

export default defineConfig({ plugins: [uni()] })
