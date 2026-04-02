import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { StoreProvider } from './context/StoreContext'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthProvider>
            <NotificationProvider>
                <StoreProvider>
                    <App />
                </StoreProvider>
            </NotificationProvider>
        </AuthProvider>
    </React.StrictMode>,
)
