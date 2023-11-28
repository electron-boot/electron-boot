import { useState } from 'react'

function Versions(): JSX.Element {
  const [versions] = useState(window.electron.process.versions)
  const click = () => {
    const invoke = window.electron.ipcRenderer.invoke('/system/logger')
    console.log(invoke)
  }
  return (
    <ul className="versions">
      <li className="electron-version">Electron v{versions.electron}</li>
      <li className="chrome-version">Chromium v{versions.chrome}</li>
      <li className="node-version">Node v{versions.node}</li>
      <li className="v8-version">V8 v{versions.v8}</li>
      <button className={'ceshi'} onClick={click}>
        点击一下
      </button>
    </ul>
  )
}

export default Versions
