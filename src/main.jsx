import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Pricing from './components/Pricing.jsx'
import Login from './components/Login.jsx'
import Account from './components/Account.jsx'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import { AuthProvider } from './lib/auth.jsx'
import './styles/global.css'

function Layout({ children, withFooter = true }) {
  return (
    <>
      <div className="backdrop" />
      <Nav />
      <main>{children}</main>
      {withFooter && <Footer />}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
          <Route path="/login" element={<Layout withFooter={false}><Login /></Layout>} />
          <Route path="/account" element={<Layout><Account /></Layout>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
