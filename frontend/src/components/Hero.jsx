import React, { useEffect } from 'react';
import { TypeAnimation } from 'react-type-animation';
import { useNavigate } from 'react-router-dom';

const Hero = ({ user }) => {
    const navigate = useNavigate();

    useEffect(() => {
        // Logs to confirm component is mounted
        console.log('Hero component mounted');
    }, []);

    const handleChatRedirect = () => {
        console.log('Chat button clicked'); // Log when the "Chat Now" button is clicked
        if (user) {
            console.log('User is authenticated, redirecting to /chat');
            navigate('/chat'); // Redirect to chat if authenticated
        } else {
            console.log('User is not authenticated, redirecting to /auth');
            navigate('/auth'); // Redirect to auth if not authenticated
        }
    };

    return (
        <div id="main" className="">
            <div className="w-full h-dvh top-0 left-0 z-10 bg-hero_gradient">
                <div className="justify-center items-center text-center w-full h-dvh max-w-[700px] m-auto flex flex-col lg-items start-items-center">
                    <h1 className="sm: text-[10vh] font-hero_header font-bold text-hero_header_color subpixel-antialiased">
                        Libra
                    </h1>
                    <h2 className="sm: text-4xl font-hero_header font-bold bg-subheader_gradient bg-clip-text text-transparent subpixel-antialiased pb-10">
                        Your Personal Tech Guide
                    </h2>
                    <h2 className="text-dark_yellow font-semibold text-5xl text-opacity-80">
                        How do I
                        <TypeAnimation
                            sequence={[
                                'Airplay',
                                2000,
                                'connect Airpods',
                                2000,
                                'increase my FPS',
                                2000,
                                'reset my Password',
                                2000,
                            ]}
                            wrapper="span"
                            speed={50}
                            style={{ display: 'inline-block', paddingRight: '0', paddingLeft: '10px' }}
                            repeat={Infinity}
                        />
                        ?
                    </h2>
                    <div className="mt-10">
                        <button
                            onClick={handleChatRedirect}
                            className="bg-mobile_menu_background text-white py-3 px-8 rounded-md font-bold hover:bg-hero_subheader_color transition duration-200"
                        >
                            Chat Now
                        </button>
                    </div>
                    <div className={'justify-center items-center'}></div>
                </div>
            </div>
        </div>
    );
};

export default Hero;
