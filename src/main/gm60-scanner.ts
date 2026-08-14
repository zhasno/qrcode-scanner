import { existsSync } from 'fs'
import { SerialPort } from 'serialport'

// GM60 sends a scan in several chunks with no consistent terminator, so we
// buffer bytes and flush once the line has been quiet for this long.
const SCAN_IDLE_MS = 100

// Hardwired GM60 sits on the primary UART. /dev/serial0 is the udev symlink;
// /dev/ttyAMA0 is what it points at once Bluetooth is off (dtoverlay=disable-bt).
const UART_PATHS = ['/dev/serial0', '/dev/ttyAMA0']

const DEBUG = process.env.GM60_DEBUG === '1'

function log(...args: unknown[]): void {
  if (DEBUG) console.log('[GM60Scanner]', ...args)
}

export class GM60Scanner {
  private port: SerialPort | null = null
  private onDataCallback: ((data: string) => void) | null = null
  private dataBuffer = ''
  private flushTimer: NodeJS.Timeout | null = null

  constructor() {
    this.initializeScanner()
  }

  private async initializeScanner(): Promise<void> {
    // SerialPort.list() does not enumerate /dev/serial0 (it is a symlink, not a
    // sysfs device), so check the filesystem directly instead.
    const portPath = UART_PATHS.find((path) => existsSync(path))

    if (!portPath) {
      console.error(
        `[GM60Scanner] No UART found at ${UART_PATHS.join(' or ')}. ` +
          'Check enable_uart=1 in /boot/firmware/config.txt and reboot.'
      )
      return
    }

    try {
      await this.connectToPort(portPath)
      console.log(`[GM60Scanner] Connected on ${portPath}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[GM60Scanner] Failed to open ${portPath}: ${message}`)

      if (message.includes('Permission denied')) {
        console.error('[GM60Scanner] Add the user to the dialout group, then log out and back in.')
      }
      // Swallow the error so the app can start and show a disconnected state.
    }
  }

  private connectToPort(portPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const port = new SerialPort(
        {
          path: portPath,
          baudRate: 9600, // GM60 factory default
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          rtscts: false,
          xon: false,
          xoff: false
        },
        (err) => (err ? reject(err) : resolve())
      )

      this.port = port

      port.on('data', (chunk: Buffer) => {
        log('rx', chunk.length, 'bytes:', chunk.toString('hex'))
        this.dataBuffer += chunk.toString('ascii')

        // One timer for the whole burst, reset on every chunk.
        if (this.flushTimer) clearTimeout(this.flushTimer)
        this.flushTimer = setTimeout(() => this.flush(), SCAN_IDLE_MS)
      })

      port.on('error', (err) => {
        console.error('[GM60Scanner] Serial port error:', err.message)
      })
    })
  }

  private flush(): void {
    this.flushTimer = null

    const data = this.dataBuffer.trim()
    this.dataBuffer = ''

    if (!data) return

    if (!this.onDataCallback) {
      console.warn('[GM60Scanner] Scan received but no callback registered - data dropped:', data)
      return
    }

    log('scan:', data)
    try {
      this.onDataCallback(data)
    } catch (error) {
      console.error('[GM60Scanner] Error in scan callback:', error)
    }
  }

  private teardown(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    this.dataBuffer = ''

    if (this.port) {
      this.port.removeAllListeners()
      this.port = null
    }
  }

  public onScan(callback: (data: string) => void): void {
    this.onDataCallback = callback
  }

  public async disconnect(): Promise<void> {
    const port = this.port
    this.teardown()

    if (port && port.isOpen) {
      await new Promise<void>((resolve) => {
        port.close((err) => {
          if (err) console.error('[GM60Scanner] Error closing serial port:', err.message)
          resolve()
        })
      })
    }
  }

  public isConnected(): boolean {
    return this.port ? this.port.isOpen : false
  }

  // Retry connection to scanner
  public async reconnect(): Promise<boolean> {
    try {
      await this.disconnect()
      await this.initializeScanner()
      return this.isConnected()
    } catch (error) {
      console.error('[GM60Scanner] Failed to reconnect:', error)
      return false
    }
  }

  // Send configuration commands to GM60 if needed.
  // NOTE: the GM60 expects binary frames (7E 00 08 01 ... + CRC), not ASCII,
  // so this will not configure the scanner as-is. Use the setup QR codes from
  // the manual instead.
  public async sendCommand(command: string): Promise<void> {
    const port = this.port

    if (!port || !port.isOpen) {
      throw new Error('Scanner not connected')
    }

    return new Promise((resolve, reject) => {
      port.write(command + '\r\n', (err) => (err ? reject(err) : resolve()))
    })
  }
}
