import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ComparisonApp from './components/ComparisonApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ComparisonApp />
  </StrictMode>,
)
