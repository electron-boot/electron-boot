import { app } from 'electron'
app.on('ready', async () => {
  const { Bootstrap } = await import('@electron-boot/framework')
  const main = await import('./imports')
  await Bootstrap.configure({
    imports: [main]
  }).run()
})
