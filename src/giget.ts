import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { extract } from 'tar'
import { resolve, dirname } from 'pathe'
import { parseInput, getTarUrl, download } from './_utils'
import type { GitInfo } from './types'

export interface DownloadRepoOptions extends Partial<GitInfo> {
}

export async function downloadRepo (input: string, dst: string, _opts: DownloadRepoOptions = {}) {
  const parsed = parseInput(input)
  const opts = { ...parsed, ..._opts }

  const extractPath = resolve(dst || opts.repo.split('/').pop())
  if (existsSync(extractPath)) {
    throw new Error(`Destination ${extractPath} already exists.`)
  }
  await mkdir(extractPath, { recursive: true })

  const tmpDir = resolve(homedir(), '.giget', opts.provider, opts.repo)
  const tarPath = resolve(tmpDir, opts.ref + '.tar.gz')
  await mkdir(dirname(tarPath), { recursive: true })
  const tarUrl = getTarUrl(opts)
  await download(tarUrl, tarPath)

  const pathFilter = opts.subpath.replace(/^\//, '')
  await extract({
    file: tarPath,
    cwd: extractPath,
    onentry (entry) {
      entry.path = entry.path.split('/').splice(1).join('/')
      if (pathFilter) {
        if (entry.path.startsWith(pathFilter)) {
          // Rewrite path
          entry.path = entry.path.substring(pathFilter.length)
        } else {
          // Skip
          entry.path = ''
        }
      }
    }
  })

  return {
    source: `${opts.provider}:${opts.repo}${pathFilter}#${opts.ref}`,
    dir: extractPath
  }
}
