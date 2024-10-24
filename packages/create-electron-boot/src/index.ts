import minimist from 'minimist'
import { blue, cyan, green, red, reset, yellow } from 'picocolors'
import path from 'node:path'
import prompts from 'prompts'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const argv = minimist<{
  template?: string
  help?: boolean
}>(process.argv.slice(2), {
  default: { help: false },
  alias: { h: 'help', t: 'template' },
  string: ['_']
})
const helpMessage = `\
Usage: create-vite [OPTION]... [DIRECTORY]

Create a new Vite project in JavaScript or TypeScript.
With no arguments, start the CLI in interactive mode.

Options:
  -t, --template NAME        use a specific template

Available templates:
${yellow('vanilla-ts     vanilla')}
${green('vue-ts         vue')}
${cyan('react-ts       react')}
${blue('solid-ts       solid')}`
export type ColorFunc = (str: string | number) => string
const cwd = process.cwd()
export interface FrameworkVariant {
  name: string
  display: string
  color: ColorFunc
}
export interface Framework {
  name: string
  display: string
  color: ColorFunc
  variants: FrameworkVariant[]
}
const FRAMEWORKS: Framework[] = [
  {
    name: 'vue',
    display: 'vue',
    color: green,
    variants: [
      {
        name: 'vue-ts',
        display: 'TypeScript',
        color: blue
      },
      {
        name: 'vue',
        display: 'JavaScript',
        color: yellow
      }
    ]
  },
  {
    name: 'react',
    display: 'React',
    color: cyan,
    variants: [
      {
        name: 'react-ts',
        display: 'TypeScript',
        color: blue
      },
      {
        name: 'react',
        display: 'JavaScript',
        color: yellow
      }
    ]
  }
]
const TEMPLATES = FRAMEWORKS.map(f => (f.variants && f.variants.map(v => v.name)) || [f.name]).reduce(
  (a, b) => a.concat(b),
  []
)
const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore'
}
console.log(renameFiles)
const defaultTargetDir = 'electron-project'

async function init(): Promise<void> {
  const argTargetDir = formatTargetDir(argv._[0])
  const argTemplate = argv.template || argv.t
  const help = argv.help
  if (help) {
    console.log(helpMessage)
    return
  }
  let targetDir = argTargetDir || defaultTargetDir
  const getProjectName = () => (targetDir === '.' ? path.basename(path.resolve()) : targetDir)
  let result: prompts.Answers<
    'projectName' | 'overwrite' | 'packageName' | 'framework' | 'variant' | 'addUpdater' | 'useElectronMirror'
  >
  try {
    result = await prompts(
      [
        {
          type: argTargetDir ? null : 'text',
          name: 'projectName',
          message: reset('Project name:'),
          initial: defaultTargetDir,
          onState: state => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir
          }
        },
        {
          type: () => {
            return !fs.existsSync(targetDir) || isEmpty(targetDir) ? null : 'select'
          },
          name: 'overwrite',
          message: () =>
            (targetDir === '.' ? 'Current directory' : `Target directory "${targetDir}"`) +
            ` is not empty. Please choose how to proceed:`,
          initial: 0,
          choices: [
            {
              title: 'Remove existing files and continue',
              value: 'yes'
            },
            {
              title: 'Cancel operation',
              value: 'no'
            },
            {
              title: 'Ignore files and continue',
              value: 'ignore'
            }
          ]
        },
        {
          type: (_, { overwrite }: { overwrite?: string }) => {
            if (overwrite === 'no') {
              throw new Error(red('✖') + ' Operation cancelled')
            }
            return null
          },
          name: 'overwriteChecker'
        },
        {
          type: () => (isValidPackageName(getProjectName()) ? null : 'text'),
          name: 'packageName',
          message: reset('Package name:'),
          initial: () => toValidPackageName(getProjectName()),
          validate: dir => isValidPackageName(dir) || 'Invalid package.json name'
        },
        {
          type: argTemplate && TEMPLATES.includes(argTemplate) ? null : 'select',
          name: 'framework',
          message:
            typeof argTemplate === 'string' && !TEMPLATES.includes(argTemplate)
              ? reset(`"${argTemplate}" isn't a valid template. Please choose from below: `)
              : reset('Select a framework:'),
          initial: 0,
          choices: FRAMEWORKS.map(framework => {
            const frameworkColor = framework.color
            return {
              title: frameworkColor(framework.display || framework.name),
              value: framework
            }
          })
        },
        {
          type: (framework: Framework) => (framework && framework.variants ? 'select' : null),
          name: 'variant',
          message: reset('Select a variant:'),
          choices: (framework: Framework) =>
            framework.variants.map(variant => {
              const variantColor = variant.color
              return {
                title: variantColor(variant.display || variant.name),
                value: variant.name
              }
            })
        },
        {
          name: 'addUpdater',
          type: 'toggle',
          message: 'Add Electron updater plugin?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        {
          name: 'useElectronMirror',
          type: 'toggle',
          message: 'Enable Electron download mirror proxy?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        }
      ],
      {
        onCancel: () => {
          throw new Error(red('✖') + ' Operation cancelled')
        }
      }
    )
  } catch (e: any) {
    console.log(e)
    return
  }
  const { framework, overwrite, packageName, variant, addUpdater, useElectronMirror } = result
  console.log(result, framework, overwrite, packageName, variant, addUpdater, useElectronMirror)
  const root = path.join(cwd, targetDir)
  if (overwrite === 'yes') {
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
  }

  // determine template
  const template: string = variant || framework?.name || argTemplate
  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'
  const isYarn1 = pkgManager === 'yarn' && pkgInfo?.version.startsWith('1.')
  console.log(template, pkgManager, isYarn1)
  console.log(`\nScaffolding project in ${root}...`)

  const templateDir = path.resolve(fileURLToPath(import.meta.url), '../..', `template-${template}`)
  const templateBaseDir = path.resolve(fileURLToPath(import.meta.url), '../..', `template-base`)
  console.log(templateBaseDir)
  const write = (file: string, content?: string) => {
    const targetPath = path.join(root, renameFiles[file] ?? file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      copy(path.join(templateDir, file), targetPath)
    }
  }

  const files = fs.readdirSync(templateDir)
  for (const file of files.filter(f => f !== 'package.json')) {
    write(file)
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8'))

  pkg.name = packageName || getProjectName()

  write('package.json', JSON.stringify(pkg, null, 2) + '\n')
}

/**
 * 这是一个格式化目标目录的函数。如果输入的目标目录存在，就去除其末尾的所有斜杠并返回；否则，就直接返回这个目标目录本身。
 *
 * @param {string | undefined} targetDir - 需要被格式化的目标目录，可能是一个字符串或者undefined。
 * @return {string | undefined} 返回格式化后的目标目录。如果原目标目录存在，返回的是一个去除了末尾所有斜杠的字符串；如果原目标目录不存在，返回的就是原目标目录本身。
 */
function formatTargetDir(targetDir: string | undefined): string | undefined {
  return targetDir?.trim().replace(/\/+$/g, '')
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

/**
 * 这是一个清空指定目录的函数。如果指定的目录不存在，则直接返回。否则，会遍历该目录下的所有文件和子目录，除了'.git'目录，其他的都会被删除。
 *
 * @param {String} dir - 需要被清空的目录路径。
 */
function emptyDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') {
      continue
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
  }
}
function isEmpty(path: string): boolean {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}
function isValidPackageName(projectName: string): boolean {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName)
}
function toValidPackageName(projectName: string): string {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-')
}
function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1]
  }
}
init().catch(e => {
  console.error(e)
})
