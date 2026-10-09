import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import Papa from 'papaparse'
import './App.css'

type Card = {
  card_id: string
  title: string
  artist: string
  year: string
  apple_music_id?: string
  apple_music_url?: string
}

type MusicKitInstance = {
  authorize: () => Promise<void>
  play: () => Promise<void>
  setQueue: (options: { song: string }) => Promise<void>
}

type MusicKitApi = {
  configure: (options: { developerToken: string; app: { name: string; build: string } }) => void
  getInstance: () => MusicKitInstance
}

declare global {
  interface Window {
    MusicKit?: MusicKitApi
  }
}

function parseCardId(value: string): string {
  try {
    const url = new URL(value)
    const parts = url.pathname.split('/').filter(Boolean)
    const cardIndex = parts.indexOf('card')
    return cardIndex >= 0 && parts[cardIndex + 1] ? parts[cardIndex + 1] : parts.at(-1) ?? value
  } catch {
    return value.trim()
  }
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [cards, setCards] = useState<Map<string, Card>>(new Map())
  const [isScanning, setIsScanning] = useState(false)
  const [manualId, setManualId] = useState('')
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [status, setStatus] = useState('Ready to scan')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}cards.csv`)
      .then((response) => {
        if (!response.ok) throw new Error('Could not load cards.csv')
        return response.text()
      })
      .then((csv) => {
        const parsed = Papa.parse<Card>(csv, { header: true, skipEmptyLines: true })
        const cardMap = new Map(parsed.data.map((card) => [card.card_id.trim(), card]))
        setCards(cardMap)
        setStatus(`${cardMap.size} card${cardMap.size === 1 ? '' : 's'} loaded`)
      })
      .catch(() => setError('Put your card list in public/cards.csv and reload the app.'))
  }, [])

  useEffect(() => () => controlsRef.current?.stop(), [])

  const stopScanner = () => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setIsScanning(false)
  }

  const playCard = async (card: Card) => {
    if (card.apple_music_url) {
      setStatus('Opening Apple Music...')
      window.location.assign(card.apple_music_url)
      return
    }
    if (!card.apple_music_id) {
      setError('This card needs an Apple Music URL or song ID.')
      return
    }

    const developerToken = import.meta.env.VITE_APPLE_MUSIC_DEVELOPER_TOKEN
    if (!developerToken) {
      setError('Add VITE_APPLE_MUSIC_DEVELOPER_TOKEN to .env.local before playing.')
      return
    }

    setError('')
    setStatus('Connecting to Apple Music...')
    const musicKit = window.MusicKit
    if (!musicKit) {
      setError('MusicKit did not load. Check your internet connection and reload.')
      return
    }

    musicKit.configure({ developerToken, app: { name: 'Hitster Cards', build: '1.0.0' } })
    const music = musicKit.getInstance()
    await music.authorize()
    await music.setQueue({ song: card.apple_music_id })
    await music.play()
    setStatus('Now playing')
  }

  const selectCard = async (rawValue: string) => {
    const cardId = parseCardId(rawValue)
    const card = cards.get(cardId)
    if (!card) {
      setError(`No card found for "${cardId}".`)
      return
    }
    setSelectedCard(card)
    await playCard(card)
  }

  const startScanner = async () => {
    if (!videoRef.current) return
    setError('')
    setStatus('Opening camera...')
    setIsScanning(true)

    try {
      const reader = new BrowserQRCodeReader()
      const devices = await BrowserQRCodeReader.listVideoInputDevices()
      const camera = devices.find((device) => /back|environment/i.test(device.label)) ?? devices[0]
      controlsRef.current = await reader.decodeFromVideoDevice(camera?.deviceId, videoRef.current, (result) => {
        if (result) {
          stopScanner()
          void selectCard(result.getText())
        }
      })
      setStatus('Point the camera at a card')
    } catch {
      stopScanner()
      setError('Camera access failed. Allow camera permission or use the card ID below.')
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">H</div>
        <div><p className="eyebrow">Home session</p><h1>Hitster Cards</h1></div>
        <span className="status-dot" aria-label={status} title={status} />
      </header>

      <section className="intro"><p className="eyebrow">Scan to play</p><h2>Put a song<br /><em>in the room.</em></h2><p className="intro-copy">Scan a card and let Apple Music take it from here.</p></section>

      <section className="scanner-panel" aria-label="QR scanner">
        <div className={`camera-frame ${isScanning ? 'is-active' : ''}`}>
          <video ref={videoRef} muted playsInline />
          {!isScanning && <div className="camera-placeholder"><span>+</span><p>Camera ready</p></div>}
          <div className="scan-corners" aria-hidden="true" />
        </div>
        <div className="scanner-actions"><button type="button" className="primary-button" onClick={isScanning ? stopScanner : startScanner}>{isScanning ? 'Stop camera' : 'Scan a card'}</button><p className="status-text">{status}</p></div>
      </section>

      {selectedCard && <section className="track-result" aria-live="polite"><div><p className="eyebrow">Selected card</p><h3>{selectedCard.title}</h3><p>{selectedCard.artist} <span>/</span> {selectedCard.year}</p></div><button type="button" className="play-button" onClick={() => void playCard(selectedCard)} aria-label="Play selected card">Play</button></section>}

      <section className="manual-panel"><div><p className="eyebrow">Testing fallback</p><h3>Enter a card ID</h3></div><form onSubmit={(event) => { event.preventDefault(); void selectCard(manualId) }}><input value={manualId} onChange={(event) => setManualId(event.target.value)} placeholder="card-001" aria-label="Card ID" /><button type="submit" className="secondary-button">Play</button></form></section>

      {error && <p className="error-message" role="alert">{error}</p>}
      <footer>Apple Music playback requires authorization and an active subscription.</footer>
    </main>
  )
}

export default App
