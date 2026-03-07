import NavBar from './components/NavBar'
import { AppRoutes } from './routes'

export default function App() {
  return (
    <div id="app-root">
      <NavBar />
      <AppRoutes />
    </div>
  )
}
