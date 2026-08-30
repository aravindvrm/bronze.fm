import { chromium, devices } from '@playwright/test'
import fs from 'node:fs'
const OUT =
  '/private/tmp/claude-501/-Volumes-SD3-2-256-Repos-bronzeFM/12b44c34-bd32-4d6b-8c93-c4fcb667640b/scratchpad'
const b = await chromium.launch()
const ctx = await b.newContext({ ...devices['Pixel 7'] })
const p = await ctx.newPage()
p.on('pageerror', (e) => console.log('PAGEERR', String(e.message).slice(0, 160)))
await p.addInitScript(() => {
  try {
    sessionStorage.setItem('bronze:splash-seen', '1')
    localStorage.setItem('bronze:reader-coached', '1')
  } catch {}
})
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
await p.getByRole('button', { name: 'Open menu' }).click()
await p.waitForTimeout(500)
fs.writeFileSync(`${OUT}/dm-menu-light.png`, await p.screenshot())
await p.getByRole('switch', { name: 'Dark mode' }).click()
await p.waitForTimeout(600)
fs.writeFileSync(`${OUT}/dm-menu-dark.png`, await p.screenshot())
console.log('data-theme:', await p.evaluate(() => document.documentElement.dataset.theme))
console.log(
  'theme-color meta:',
  await p.evaluate(() => document.querySelector('meta[name=theme-color]').content),
)
await p.keyboard.press('Escape')
await p.waitForTimeout(500)
fs.writeFileSync(`${OUT}/dm-feed.png`, await p.screenshot())
// persistence across a reload, and no white flash
await p.reload({ waitUntil: 'domcontentloaded' })
console.log(
  'theme before paint on reload:',
  await p.evaluate(() => document.documentElement.dataset.theme),
)
await p.waitForTimeout(1200)
await p.goto('http://localhost:5173/@dean/atonomos/read', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
fs.writeFileSync(`${OUT}/dm-reader.png`, await p.screenshot())
await p.goto('http://localhost:5173/@dean', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
fs.writeFileSync(`${OUT}/dm-profile.png`, await p.screenshot())
await b.close()
