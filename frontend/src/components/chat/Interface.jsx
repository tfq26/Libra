import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { AiOutlineArrowUp } from "react-icons/ai";
import packageJson from "../../../../package.json"; // Adjusted path

const Interface = () => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const userName = "User123"; // Replace with dynamic username if needed
    const inputRef = useRef(null); // Ref for input field

    // Handle sending the message
    const handleSendMessage = async (userMessage) => {
        if (!userMessage.trim()) return;

        // Add user message to the chat
        setMessages((prevMessages) => [...prevMessages, { text: userMessage, sender: "user" }]);
        setIsLoading(true);
        setError(null);

        try {
            console.log("Sending message to backend:", { userName, message: userMessage });

            const response = await fetch("https://guarded-garden-07517-fadc37928c0d.herokuapp.com", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userName, message: userMessage }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch the bot's response");
            }

            const data = await response.json();
            console.log("Parsed response from backend:", data);

            // Add bot's response to the chat
            if (data?.message) {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { text: data.message, sender: "bot", markdown: true }, // Mark as Markdown
                ]);
            } else {
                setError("No valid response from the bot.");
            }
        } catch (err) {
            console.error("Error during fetch:", err);
            setError("Failed to send message. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle input field keydown event
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSendMessage(e.target.value);
            e.target.value = "";
        }
    };

    // Handle click on send button
    const handleButtonClick = () => {
        const inputValue = inputRef.current.value;
        handleSendMessage(inputValue);
        inputRef.current.value = "";
    };

    return (
        <div className="flex flex-col h-screen p-4 bg-interface_gradient">
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col h-full w-full md:w-3/4 lg:w-[80%] border-8 border-transparent">
                    <div className="flex flex-col items-center gap-4">
                        <a href={"/"}
                           className="relative text-[5rem] font-hero_header font-bold text-hero_header_color subpixel-antialiased group">
                            <img
                                src={"/assets/libra-svgrepo-com.svg"}
                                className={'h-auto size-[4rem] self-center hover:rotate-[360deg] ease-in-out duration-[550ms]'}
                            />
                            <div
                                className="absolute flex top-full mt-1.5 ml-1/2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-[900ms] ease-in-out bg-mobile_menu_background text-white text-sm p-2 rounded whitespace-nowrap">
                                {packageJson.version}
                            </div>
                        </a>
                    </div>
                    {/* Message List */}
                    <div
                        className="flex-1 flex flex-col overflow-y-auto p-4 border-4 border-transparent rounded-lg bg-transparent">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`my-2 px-4 py-2 rounded-lg ${
                                    msg.sender === "user"
                                        ? "self-start bg-indigo-950 text-gray-100 text-xl max-w-[75%]" // User messages
                                        : "self-end bg-[#6e10b5] text-gray-100 text-md max-w-[50%]" // Bot messages
                                } font-semibold`}
                            >
                                {/* Render Markdown if the message is marked as Markdown */}
                                {msg.markdown ? (
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                ) : (
                                    msg.text
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div
                                className="my-0.5 px-4 py-2 max-w-fit rounded-lg self-start bg-[#1f0263] text-dark_yellow font-semibold text-sm">
                                Typing...
                            </div>
                        )}
                        {error && (
                            <div
                                className="my-2 px-4 py-2 max-w-fit rounded-lg self-start bg-red-800 text-white text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Input Field */}
                    <div className="flex items-center justify-center gap-3 w-full h-auto p-4 bg-transparent">
                        <div className="relative w-full md:w-3/4 lg:w-[80%]">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Type a message..."
                                className="w-full p-2 rounded-full border-2 px-3 border-transparent bg-gray-100 text-purple-600 pr-12"
                                /* Add padding-right to make space for the button */
                                onKeyDown={handleKeyDown}
                                onChange={() => setError(null)} // Clear error on input change
                            />
                            <button
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-hero_subheader_color text-white text-xl border-none rounded-full p-2 cursor-pointer hover:shadow-[#da05ff] hover:shadow-sm transition ease-in-out duration-200"
                                onClick={handleButtonClick}
                            >
                                <AiOutlineArrowUp size={20}/>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Interface;
