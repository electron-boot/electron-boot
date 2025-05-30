import * as fs from 'node:fs'

import { app, screen } from 'electron'
import * as path from 'path'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  displayBounds?: Electron.Rectangle
  isMaximized?: boolean
  isFullScreen?: boolean
}

interface WindowStateConfig {
  file?: string
  path?: string
  maximize?: boolean
  fullScreen?: boolean
  defaultWidth?: number
  defaultHeight?: number
}

interface BaseWindow {
  isMaximized(): boolean
  isMinimized(): boolean
  isFullScreen(): boolean
  getBounds(): Electron.Rectangle
  maximize(): void
  setFullScreen(fullScreen: boolean): void
  removeListener(event: string, listener: (...args: any[]) => void): this
  on(event: 'resize' | 'move' | 'close' | 'closed', listener: (...args: any[]) => void): this
}

interface State {
  displayBounds: Electron.Rectangle
  /** The saved height of loaded state. `defaultHeight` if the state has not been saved yet. */
  height: number
  /** true if the window state was saved while the window was in full screen mode. `undefined` if the state has not been saved yet. */
  isFullScreen: boolean
  /** `true` if the window state was saved while the window was maximized. `undefined` if the state has not been saved yet. */
  isMaximized: boolean
  /** Register listeners on the given `BrowserWindow` for events that are related to size or position changes (resize, move). It will also restore the window's maximized or full screen state. When the window is closed we automatically remove the listeners and save the state. */
  manage: (window: BaseWindow) => void
  /** Saves the current state of the given `BrowserWindow`. This exists mostly for legacy purposes, and in most cases it's better to just use `manage()`. */
  saveState: (window: BaseWindow) => void
  /** Removes all listeners of the managed `BrowserWindow` in case it does not need to be managed anymore. */
  unmanage: () => void
  /** Resets the state to the default values. */
  resetStateToDefault: () => void
  /** The saved width of loaded state. `defaultWidth` if the state has not been saved yet. */
  width: number
  /** The saved x coordinate of the loaded state. `undefined` if the state has not been saved yet. */
  x: number
  /** The saved y coordinate of the loaded state. `undefined` if the state has not been saved yet. */
  y: number
}

export default function (options: WindowStateConfig): State {
  const electronApp = app
  const electronScreen = screen
  let state: WindowState
  let winRef: BaseWindow | null
  let stateChangeTimer: NodeJS.Timeout | undefined
  const eventHandlingDelay = 100

  const config: Required<WindowStateConfig> = Object.assign(
    {
      file: 'window-state.json',
      path: electronApp.getPath('userData'),
      maximize: true,
      fullScreen: true,
      defaultWidth: 800,
      defaultHeight: 600
    },
    options
  ) as Required<WindowStateConfig>

  const fullStoreFileName = path.join(config.path, config.file)

  function isNormal(win: BaseWindow): boolean {
    return !win.isMaximized() && !win.isMinimized() && !win.isFullScreen()
  }

  function hasBounds(): boolean {
    return (
      state &&
      Number.isInteger(state.x) &&
      Number.isInteger(state.y) &&
      Number.isInteger(state.width) &&
      state.width > 0 &&
      Number.isInteger(state.height) &&
      state.height > 0
    )
  }

  function resetStateToDefault(): void {
    const displayBounds = electronScreen.getPrimaryDisplay().bounds

    state = {
      width: config.defaultWidth,
      height: config.defaultHeight,
      x: 0,
      y: 0,
      displayBounds
    }
  }

  function windowWithinBounds(bounds: Electron.Rectangle): boolean {
    return (
      state.x !== undefined &&
      state.y !== undefined &&
      state.width !== undefined &&
      state.height !== undefined &&
      state.x >= bounds.x &&
      state.y >= bounds.y &&
      state.x + state.width <= bounds.x + bounds.width &&
      state.y + state.height <= bounds.y + bounds.height
    )
  }

  function ensureWindowVisibleOnSomeDisplay(): void {
    const visible = electronScreen.getAllDisplays().some(display => {
      return windowWithinBounds(display.bounds)
    })

    if (!visible) {
      resetStateToDefault()
    }
  }

  function validateState(): void {
    const isValid = state && (hasBounds() || state.isMaximized || state.isFullScreen)
    if (!isValid) {
      state = {} as WindowState // Reset state to an empty object if invalid
      return
    }

    if (hasBounds() && state.displayBounds) {
      ensureWindowVisibleOnSomeDisplay()
    }
  }

  function updateState(_win?: BaseWindow): void {
    const win = _win || winRef
    if (!win) {
      return
    }
    try {
      const winBounds = win.getBounds()
      if (isNormal(win)) {
        state.x = winBounds.x
        state.y = winBounds.y
        state.width = winBounds.width
        state.height = winBounds.height
      }
      state.isMaximized = win.isMaximized()
      state.isFullScreen = win.isFullScreen()
      state.displayBounds = electronScreen.getDisplayMatching(winBounds).bounds
    } catch (err) {
      // Don't care
    }
  }

  function saveState(win?: BaseWindow): void {
    if (win) {
      updateState(win)
    }

    try {
      fs.mkdirSync(path.dirname(fullStoreFileName), { recursive: true })
      fs.writeFileSync(fullStoreFileName, JSON.stringify(state))
    } catch (err) {
      // Don't care
    }
  }

  function stateChangeHandler(): void {
    clearTimeout(stateChangeTimer)
    stateChangeTimer = setTimeout(() => updateState(), eventHandlingDelay)
  }

  function closeHandler(): void {
    updateState()
  }

  function closedHandler(): void {
    unmanage()
    saveState()
  }

  function manage(win: BaseWindow): void {
    if (config.maximize && state.isMaximized) {
      win.maximize()
    }
    if (config.fullScreen && state.isFullScreen) {
      win.setFullScreen(true)
    }
    win.on('resize', stateChangeHandler)
    win.on('move', stateChangeHandler)
    win.on('close', closeHandler)
    win.on('closed', closedHandler)
    winRef = win
  }

  function unmanage(): void {
    if (winRef) {
      winRef.removeListener('resize', stateChangeHandler)
      winRef.removeListener('move', stateChangeHandler)
      clearTimeout(stateChangeTimer)
      winRef.removeListener('close', closeHandler)
      winRef.removeListener('closed', closedHandler)
      winRef = null
    }
  }

  try {
    state = JSON.parse(fs.readFileSync(fullStoreFileName, 'utf-8'))
  } catch (err) {
    // Don't care
  }

  validateState()

  state = Object.assign(
    {
      width: config.defaultWidth,
      height: config.defaultHeight
    },
    state!
  )

  return {
    get x(): number {
      return state.x!
    },
    get y(): number {
      return state.y!
    },
    get width(): number {
      return state.width
    },
    get height(): number {
      return state.height
    },
    get displayBounds(): Electron.Rectangle {
      return state.displayBounds!
    },
    get isMaximized(): boolean {
      return state.isMaximized!
    },
    get isFullScreen(): boolean {
      return state.isFullScreen!
    },
    saveState,
    unmanage,
    manage,
    resetStateToDefault
  }
}
