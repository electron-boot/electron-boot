import { defineConfig } from "rollup";
import dts from "rollup-plugin-dts";
import externals from "rollup-plugin-node-externals";
import esbuild from "rollup-plugin-esbuild";
import typescript from "@rollup/plugin-typescript";
import rm from "rollup-plugin-rm";

const usePreferConst = true; // Use "const" instead of "var"
const usePreserveModules = true; // `true` -> keep modules structure, `false` -> combine everything into a single file
const useStrict = true; // Use "strict"
const useThrowOnError = true; // On error throw and exception
const useSourceMap = true; // Generate source map files
const useEsbuild = true; // `true` -> use esbuild, `false` use tsc

export default defineConfig([
  {
    // .d.ts build
    input: "src/index.ts",
    output: {
      file: "dist/types/index.d.ts",
      format: "es",
    },
    plugins: [rm("dist", "buildStart"), externals(), dts()],
  },
  {
    // CJS build
    input: "src/index.ts",
    output: {
      dir: "dist/cjs",
      format: "cjs",
      generatedCode: {
        constBindings: usePreferConst,
      },
      preserveModules: usePreserveModules,
      strict: useStrict,
      entryFileNames: "[name].cjs",
      sourcemap: useSourceMap,
    },
    plugins: [
      externals(),
      useEsbuild
        ? esbuild()
        : typescript({
            noEmitOnError: useThrowOnError,
            outDir: "dist/cjs",
            removeComments: true,
          }),
    ],
  },
  {
    // ESM builds
    input: "src/index.ts",
    output: {
      dir: "dist/esm",
      format: "es",
      generatedCode: {
        constBindings: usePreferConst,
      },
      preserveModules: usePreserveModules,
      strict: useStrict,
      entryFileNames: "[name].mjs",
      sourcemap: useSourceMap,
    },
    plugins: [
      externals(),
      useEsbuild
        ? esbuild()
        : typescript({
            noEmitOnError: useThrowOnError,
            outDir: "dist/esm",
            removeComments: true,
          }),
    ],
  },
]);
