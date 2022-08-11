import fs from 'fs'
import mkdirp from 'mkdirp'

const run = () => {
  mkdirp.sync('bin')
  fs.writeFileSync('bin/file.exe', 'lol')
  fs.writeFileSync('bin/file2.exe', 'lol')
  fs.writeFileSync('bin/file3.exe', 'lol')
}

run()
