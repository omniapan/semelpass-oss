import React, { useState } from 'react'
import Gate from './pages/Gate.jsx'
import HowItWorks from './pages/HowItWorks.jsx'

export default function App() {
  const [view, setView] = useState('gate')
  if (view === 'howItWorks') return <HowItWorks onBack={() => setView('gate')} />
  return <Gate onHowItWorks={() => setView('howItWorks')} />
}
