import React from 'react';
import AboutItem from "./AboutItem.jsx";

const data = [
    {
        title: 'Personalized Help at a glance',
        details: 'Ever wonder why your TV isn\'t working? How to fix it? That\'s what Libra is here for!\n It\'s here to help you fix your tech in terms that you can understand'
    },
    {
        "title": "Why is it called Libra?",
        "details": "A Libra in the context of Zodiac signs describes someone who is sociable, charming and balanced. All of these things describe this project, thus Libra was born!"
    },

    {
        title: 'Learning made magical',
        details: 'Learn more about your tech and learn new ways it can interact with your life with Libra\'s suggestions and explanations'
    },
    {
        title: 'Text or Talk, Your choice',
        details: 'Use messages to describe your issue or talk directly to Libra to get help'
    },
    {
        title: 'Powered by Google Gemini',
        details: 'Libra is powered by Google Gemini, and leverages the latest AI technologies to handle anything simple or more complex'
    },
];

const About = () => {
    return (
        <div className={'flex flex-row'}>
            <div id="about"
                 className="flex flex-col items-center w-full h-auto min-h-screen top-0 left-0 z-10 bg-about_gradient pt-10">
                <h1 className="text-9xl my-5 font-bold text-yellow-400">What is Libra?</h1>

                {/* Render AboutItems */}
                {data.map((item, idx) => {
                    return (
                        <AboutItem
                            key={idx}
                            title={item.title}
                            details={item.details}
                        />
                    );
                })}

                {/* Logos Section */}
                <div className="mt-6 flex justify-center space-x-10 pb-4">
                    {/* React Logo */}
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg"
                        alt="React Logo"
                        className="w-20 h-20 object-contain animate-slow-spin"
                    />
                    {/* Gemini Logo */}
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg"
                        alt="Gemini Logo"
                        className="object-contain h-[4rem]"
                    />
                    {/* Tailwind CSS Logo */}
                    <img
                        src="/assets/Tailwind_CSS_Logo.svg"
                        alt="Tailwind CSS Logo"
                        className="w-20 h-20 object-contain animate-glow fill-black"
                    />
                </div>
            </div>
        </div>

    );
};

export default About;
