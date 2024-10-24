import type { InputPluginOption } from 'rollup'
import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

const usePreferConst = true // Use "const" instead of "var"
const usePreserveModules = true // `true` -> keep modules structure, `false` -> combine everything into a single file
const useStrict = true // Use "strict"
const useThrowOnError = true // On error throw and exception
const useSourceMap = true // Generate source map files
const useEsbuild = true // `true` -> use esbuild, `false` use tsc
const plugins: InputPluginOption = [
  useEsbuild
    ? esbuild()
    : typescript({
        noEmitOnError: useThrowOnError,
        outDir: 'dist',
        removeComments: true
      })
]
if (!usePreserveModules)
  plugins.concat(
    commonjs({
      include: /node_modules/,
      ignore: name => {
        return name === 'events'
      }
    }),
    resolve()
  )

export default defineConfig([
  {
    // ESM builds
    input: 'src/index.ts',
    output: {
      dir: 'dist',
      format: 'cjs',
      generatedCode: {
        constBindings: usePreferConst
      },
      preserveModules: usePreserveModules,
      strict: useStrict,
      entryFileNames: '[name].js',
      sourcemap: useSourceMap
    },
    plugins: plugins
  }
])
