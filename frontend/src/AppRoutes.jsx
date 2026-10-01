
import { useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'

const AppRoutes = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('chatspace-authenticated') === 'true',
  )
  const [userName, setUserName] = useState(
    () => sessionStorage.getItem('chatspace-user') || 'Account',
  )

  const handleAuthenticated = (user) => {
    const fullName = `${user.fullName.firstName} ${user.fullName.lastName}`.trim()
    sessionStorage.setItem('chatspace-authenticated', 'true')
    sessionStorage.setItem('chatspace-user', fullName)
    setUserName(fullName)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('chatspace-authenticated')
    sessionStorage.removeItem('chatspace-user')
    document.cookie = 'token=; Max-Age=0; path=/'
    setUserName('Account')
    setIsAuthenticated(false)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path='/'
          element={isAuthenticated ? <Home onLogout={handleLogout} userName={userName} /> : <Navigate to='/login' replace />}
        />
        <Route path='/register' element={<Register onAuthenticated={handleAuthenticated} />} />
        <Route path='/login' element={<Login onAuthenticated={handleAuthenticated} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
