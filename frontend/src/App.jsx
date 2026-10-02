import AppRoutes from "./AppRoutes"
import { Provider } from 'react-redux'
import { store } from './store/store'
import './theme.css'
import './App.css'

const App = () => {
  return (
  <Provider store={store}>
   <AppRoutes />
  </Provider>
  )
}

export default App
