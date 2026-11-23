import AppRoutes from "./AppRoutes"
import { Provider } from 'react-redux'
import { store } from './store/store'
import './theme.css'
import './App.css'
import './azreal-robot.css'
// Swap for './azreal-light.css' (and data-theme="light" in index.html) for the white theme
import './azreal-devil.css'

const App = () => {
  return (
  <Provider store={store}>
   <AppRoutes />
  </Provider>
  )
}

export default App
