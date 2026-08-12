const fs = require('fs')
const path = require('path')
const pug = require('pug')

const root = path.join(__dirname, '..')
const entry = path.join(root, 'src/html/index.pug')
const dataEntry = path.join(root, 'src/data/index.js')
const outDir = path.join(root, 'docs')
const outFile = path.join(outDir, 'index.html')
const watch = process.argv.includes('-w') || process.argv.includes('--watch')

function clearRequireCache(filePath) {
  try {
    const resolved = require.resolve(filePath)
    const queue = [resolved]
    const seen = new Set()

    while (queue.length) {
      const id = queue.pop()
      if (seen.has(id) || !require.cache[id]) continue
      seen.add(id)
      const mod = require.cache[id]
      for (const child of mod.children) queue.push(child.id)
      delete require.cache[id]
    }
  } catch {
    // first run or missing module — ignore
  }
}

function loadLocals() {
  clearRequireCache(dataEntry)
  return require(dataEntry)
}

function build() {
  const html = pug.renderFile(entry, {
    ...loadLocals(),
    filename: entry,
  })

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outFile, html)
  console.log(`rendered ${outFile}`)
}

build()

if (watch) {
  const watchDirs = [
    path.join(root, 'src/html'),
    path.join(root, 'src/data'),
  ]

  for (const dir of watchDirs) {
    fs.watch(dir, { recursive: true }, (_event, filename) => {
      if (!filename) return
      try {
        build()
      } catch (err) {
        console.error(err)
      }
    })
  }

  console.log('watching src/html + src/data')
}
