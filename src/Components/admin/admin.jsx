import React, { useState, useEffect } from 'react';
import Dashboard from './dashboard.jsx';
import Bookings from './bookings.jsx';
import Analytics from './analytics.jsx';
import NewRegistrations from './newregistrations.jsx';
import Subscribers from './subscribers.jsx';
import Reports from './reports.jsx';
import QRScanner from './QRScanner.jsx';
import Payments from './payments.jsx';
import ManageEvents from './ManageEvents.jsx';
import './admin.css';

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);

    useEffect(() => {
        try {
            if (sessionStorage.getItem('adminLoggedIn') === '1') {
                setIsAuthenticated(true);
            }
        } catch (e) {
            // ignore storage errors
        }
    }, []);

    const ADMIN_CREDENTIALS = {
        username: 'admin001',
        password: 'techvaseegrah'
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setLoginError('');
        
        setTimeout(() => {
            if (loginData.username === ADMIN_CREDENTIALS.username && 
                loginData.password === ADMIN_CREDENTIALS.password) {
                setIsAuthenticated(true);
                sessionStorage.setItem('adminLoggedIn', '1');
            } else {
                setLoginError('Invalid username or password.');
            }
            setIsLoading(false);
        }, 800);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setLoginData(prev => ({ ...prev, [name]: value }));
        if (loginError) setLoginError('');
    };
    
    const handleLogout = () => {
        setIsAuthenticated(false);
        setLoginData({ username: '', password: '' });
        sessionStorage.removeItem('adminLoggedIn');
        setActiveTab('dashboard');
    };

    const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);

    if (!isAuthenticated) {
        return (
            <div className="admin-login-background">
                <div className="admin-login-panel">
                    <h1>Admin Panel</h1>
                    <p>Please sign in to access the administrative dashboard</p>
                    <form onSubmit={handleLogin}>
                        <div className="input-group">
                            <label htmlFor="username">USERNAME</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                placeholder="ENTER YOUR USERNAME"
                                value={loginData.username}
                                onChange={handleInputChange}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">PASSWORD</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                placeholder="ENTER YOUR PASSWORD"
                                value={loginData.password}
                                onChange={handleInputChange}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        {loginError && <p className="login-error">{loginError}</p>}
                        <button type="submit" className="sign-in-button" disabled={isLoading}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>
                    <div className="footer-text">
                        <p>🔒 Secure Admin Access</p>
                    </div>
                </div>
            </div>
        );
    }

    const renderTabContent = () => {
        try {
            switch (activeTab) {
                case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
                case 'bookings': return <Bookings />;
                case 'analytics': return <Analytics />;
                case 'newregistrations': return <NewRegistrations />;
                case 'subscribers': return <Subscribers />;
                case 'reports': return <Reports />;
                case 'qrscanner': return <QRScanner />;
                case 'payments': return <Payments />;
                case 'manageevents': return <ManageEvents />;
                default: return <Dashboard setActiveTab={setActiveTab} />;
            }
        } catch (error) {
            console.error('Error rendering admin component:', error);
            return (
                <div>
                    <h2>Error Loading Component</h2>
                    <p>{error.message}</p>
                    <button onClick={() => setActiveTab('dashboard')}>
                        Return to Dashboard
                    </button>
                </div>
            );
        }
    };
    
    const navItems = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'bookings', label: 'Bookings' },
        { id: 'payments', label: 'Payments' },
        { id: 'manageevents', label: 'Manage Events' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'newregistrations', label: 'Registrations' },
        { id: 'subscribers', label: 'Subscribers' },
        { id: 'reports', label: 'Reports' },
        { id: 'qrscanner', label: 'QR Scanner' },
    ];

    return (
        <div className="admin-page-container">
            <header className="admin-header">
                <div className="admin-header-left">
                    <button onClick={toggleSidebar} className="menu-toggle-btn">☰</button>
                    <h1>Admin</h1>
                </div>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </header>
            <div className="admin-main-content">
                <nav className={`sidebar-nav ${!isSidebarVisible ? 'hidden' : ''}`}>
                    {navItems.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id)} 
                            className={`sidebar-button ${activeTab === item.id ? 'active' : ''}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
                <main className="admin-content-area">
                    {renderTabContent()}
                </main>
            </div>
        </div>
    );
};

export default AdminPage;