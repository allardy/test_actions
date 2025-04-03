#!/usr/bin/env node

const fs = require('fs')
const readline = require('readline')
const path = require('path')

/**
 * A more advanced TSServer log analyzer that can handle multi-line JSON
 *
 * Usage: node analyze-tsserver-log.js /path/to/tsserver.log
 */

// This regex will match lines that look like:
//   Info 8    [09:31:15.507] request:
//   Info 10   [09:31:15.508] response:
//   Perf 11   [09:31:15.508] ...
//   Err 12    [09:31:15.508] ...
// etc.
const LOG_ENTRY_REGEX = /^(Info|Perf|Err)\s+\d+\s+\[\d{2}:\d{2}:\d{2}\.\d{3}\]/

/**
 * Parse "HH:MM:SS.mmm" to total milliseconds of the day.
 *
 * We assume the line includes something like "[09:31:15.507]" which we can extract separately.
 */
const TIME_REGEX = /\[(\d{2}):(\d{2}):(\d{2})\.(\d{1,3})\]/

/**
 * Convert "HH:MM:SS.mmm" to integer milliseconds from midnight.
 */
function timeStrToMillis(hh, mm, ss, ms) {
  return parseInt(hh, 10) * 3600000 + parseInt(mm, 10) * 60000 + parseInt(ss, 10) * 1000 + parseInt(ms, 10)
}

// We'll store data about each request in a map: requestSeq -> { command, time, ... }
const requests = new Map()
// We'll store the completed requests with durations for final analysis
const completedRequests = []

/**
 * We define a "Block" to hold info about either a request or a response line,
 * plus the raw JSON lines until we see another log entry.
 */
class LogBlock {
  constructor(type, timestampMillis) {
    this.type = type // 'request', 'response', or something else
    this.timestampMillis = timestampMillis
    this.rawJsonLines = []
  }

  addLine(line) {
    this.rawJsonLines.push(line)
  }

  /**
   * Attempt to parse the JSON collected in `rawJsonLines`.
   * Returns the parsed object or null if parse fails.
   */
  parseJson() {
    const jsonText = this.rawJsonLines.join('\n').trim()
    if (!jsonText) return null
    try {
      return JSON.parse(jsonText)
    } catch (error) {
      // Could log an error if needed
      return null
    }
  }
}

/**
 * Main function to parse the log and analyze it.
 */
async function analyzeLog(filePath) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity
  })

  let currentBlock = null // The block we are currently collecting lines for

  function finalizeBlock(block) {
    // Parse the block's JSON if it's a request or response
    if (!block || (block.type !== 'request' && block.type !== 'response')) {
      return
    }

    const parsed = block.parseJson()
    if (!parsed) return

    if (block.type === 'request') {
      const { seq, command } = parsed
      if (typeof seq === 'number') {
        // Store the request info
        requests.set(seq, {
          seq,
          command,
          requestTime: block.timestampMillis
        })
      }
    } else if (block.type === 'response') {
      const { request_seq, command, success } = parsed
      if (typeof request_seq === 'number') {
        // Match with a previously stored request
        const reqData = requests.get(request_seq)
        if (reqData) {
          const duration = block.timestampMillis - reqData.requestTime
          completedRequests.push({
            seq: request_seq,
            command: command || reqData.command,
            startTime: reqData.requestTime,
            endTime: block.timestampMillis,
            duration,
            success
          })
          // Remove from the map to keep memory usage smaller
          requests.delete(request_seq)
        }
      }
    }
  }
  sdfsdfsdfs
  sdfsdf
  for await (const line of rl) {
    // Does this line indicate a new log entry?
    const isNewEntry = LOG_ENTRY_REGEX.test(line)

    if (isNewEntry) {
      // First, finalize the old block (if it exists)
      finalizeBlock(currentBlock)

      // Parse out type = request/response from the line, plus timestamp
      let blockType = null
      if (line.includes('request:')) blockType = 'request'
      else if (line.includes('response:')) blockType = 'response'

      // Parse the time from the line
      const timeMatch = line.match(TIME_REGEX)
      let timestampMillis = 0
      if (timeMatch) {
        const [, hh, mm, ss, ms] = timeMatch
        timestampMillis = timeStrToMillis(hh, mm, ss, ms)
      }

      // Create a new currentBlock
      currentBlock = new LogBlock(blockType, timestampMillis)

      // If there's leftover text **after** 'request:' or 'response:' on the same line,
      // we might want to parse it as the start of JSON. Often TSServer logs put the JSON on new lines,
      // but if it’s on the same line, we can handle that here:
      // e.g. Info 10   [09:31:15.508] response: { "seq":0,"type":"response", ... }
      // In your example it appears on new lines, so we may not need this part,
      // but let's handle it just in case:
      const reqIdx = line.indexOf('request:')
      const respIdx = line.indexOf('response:')
      let jsonPart = ''
      if (reqIdx >= 0) {
        jsonPart = line.slice(reqIdx + 'request:'.length).trim()
      } else if (respIdx >= 0) {
        jsonPart = line.slice(respIdx + 'response:'.length).trim()
      }
      if (jsonPart) {
        // If there's any JSON text on the same line, add it as the first raw line
        currentBlock.addLine(jsonPart)
      }
    } else {
      // Not a new log entry: this must be part of the currentBlock’s JSON
      if (currentBlock) {
        currentBlock.addLine(line)
      }
    }
  }

  // At the end, finalize the last block if any
  finalizeBlock(currentBlock)

  // Now we have a list of completedRequests with durations
  // Sort them by duration descending
  completedRequests.sort((a, b) => b.duration - a.duration)

  // Print out a summary
  console.log(`Total completed requests: ${completedRequests.length}`)
  console.log('Top 10 slowest requests:')
  completedRequests.slice(0, 10).forEach((req, idx) => {
    console.log(
      `${idx + 1}. seq=${req.seq}, command=${req.command}, duration=${req.duration}ms, success=${req.success}`
    )
  })
}

// --- Entry Point ---

// The log file path is the first argument
const logFile = process.argv[2]
if (!logFile) {
  console.error('Usage: node analyze-tsserver-log.js /path/to/tsserver.log')
  process.exit(1)
}

analyzeLog(path.resolve(logFile))
  .then(() => console.log('Analysis complete.'))
  .catch((err) => console.error('Error analyzing log:', err))
