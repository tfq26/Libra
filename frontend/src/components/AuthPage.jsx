import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiFillGoogleCircle } from 'react-icons/ai';
import { useGoogleLogin } from '@react-oauth/google';

const AuthPage = ({ onLogin }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistered, setIsRegistered] = useState(false);
    const [loading, setLoading] = useState(false);

    // ---------------------------
    // Handle Google Login
    // ---------------------------
    const handleGoogleLogin = async (googleResponse) => {
        try {
            const { access_token } = googleResponse; // from Google
            console.log('Google Access Token:', access_token);

            // Send token to backend with credentials for session
            setLoading(true);
            const googleData = await fetch('http://localhost:5174/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Important for session cookies
                body: JSON.stringify({ accessToken: access_token }),
            });

            const data = await googleData.json();
            console.log('User Data from Backend (Google):', data);

            if (!googleData.ok) {
                alert(data.error || 'Google login failed');
                setLoading(false);
                return;
            }

            // onLogin updates parent state with user info
            onLogin(data.user);
            setLoading(false);
            navigate('/chat'); // or wherever you want to redirect
        } catch (error) {
            console.error('Error during Google login:', error);
            setLoading(false);
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: handleGoogleLogin,
        onError: (err) => console.error('Google Login Failed:', err),
    });

    // ---------------------------
    // Handle Registration
    // ---------------------------
    const handleRegister = async (e) => {
        e.preventDefault();
        if (!email || !username || !password) {
            alert('Please fill in email, username, and password!');
            return;
        }
        try {
            setLoading(true);
            const res = await fetch('http://localhost:5174/auth/register', {
                method: 'POST',
                credentials: 'include', // for session cookie
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: username,
                    email: email,
                    password: password,
                }),
            });
            const data = await res.json();
            setLoading(false);

            if (!res.ok) {
                alert(data.error || 'Registration failed');
                return;
            }

            console.log('User registered successfully:', data);

            // Optionally, auto-login the user right after registration:
            await handleLocalLogin(email, password);

            setIsRegistered(true);
        } catch (error) {
            console.error('Error registering user:', error);
            setLoading(false);
        }
    };

    // ---------------------------
    // (Optional) Local Login Flow
    // ---------------------------
    const handleLocalLogin = async (email, password) => {
        try {
            setLoading(true);
            const res = await fetch('http://localhost:5174/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            setLoading(false);

            if (!res.ok) {
                alert(data.error || 'Login failed');
                return;
            }
            console.log('Local login successful:', data);

            // Update parent state (user context) with user object
            onLogin(data.user);

            // Redirect to chat or home
            navigate('/chat');
        } catch (err) {
            console.error('Error logging in:', err);
            setLoading(false);
        }
    };

    // ---------------------------
    // Render
    // ---------------------------
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-hero_gradient">
            <div className="flex flex-col text-center p-6 bg-mobile_menu_background shadow-lg rounded-lg items-center max-w-sm w-full">
                <img
                    src="/assets/libra-svgrepo-com.svg"
                    className="h-auto w-16 self-center pb-4"
                    alt="Libra Logo"
                />
                <h1 className="text-3xl text-white font-bold mb-2">
                    {isRegistered ? 'Sign In to Libra' : 'Sign Up for Libra'}
                </h1>
                <p className="mb-6 text-dark_yellow">
                    {isRegistered
                        ? 'Welcome back! Please sign in.'
                        : 'Create an Account to access your personal tech guide.'}
                </p>

                {/* Registration / Login Form */}
                <form onSubmit={handleRegister} className="mb-4 w-full">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        className="mb-2 p-2 rounded-md border-2 border-gray-300 w-full"
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        className="mb-2 p-2 rounded-md border-2 border-gray-300 w-full"
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        className="mb-4 p-2 rounded-md border-2 border-gray-300 w-full"
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-primary_buttons text-white rounded-lg hover:bg-purple-900 transition duration-200"
                    >
                        {loading ? 'Please wait...' : isRegistered ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                {/* Google Login Button */}
                <button
                    onClick={() => googleLogin()}
                    disabled={loading}
                    className="flex w-full items-center justify-center px-6 py-2 bg-indigo-800 text-white rounded-lg shadow-md hover:bg-indigo-900 transition duration-200"
                >
                    <AiFillGoogleCircle size={24} />
                    <span className="ml-3 font-semibold">
            {loading ? 'Authenticating...' : 'Login with Google'}
          </span>
                </button>
            </div>
        </div>
    );
};

export default AuthPage;
