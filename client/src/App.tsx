import { useState, useEffect } from 'react'
import axios from 'axios'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [helloMessage, setHelloMessage] = useState<string | null>(null)
  const [helloError, setHelloError] = useState<string | null>(null)

  useEffect(() => {
    axios
      .get<{ message: string }>('/api/hello')
      .then((res) => setHelloMessage(res.data.message))
      .catch((err) => setHelloError(err.message))
  }, [])

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      {helloMessage && <p className="hello-message">Server says: {helloMessage}</p>}
      {helloError && <p className="hello-error">Failed to reach server: {helloError}</p>}
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
