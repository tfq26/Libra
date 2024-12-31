import { useState, useEffect, useRef } from "react";
import {
    AiOutlineHome,
    AiOutlineGithub,
    AiOutlineQuestionCircle,
    AiOutlineMessage,
    AiOutlineMenu,
    AiOutlineLogin,
} from "react-icons/ai";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = ({ user, onLogout }) => {
    const [nav, setNav] = useState(false);
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [clickTimeout, setClickTimeout] = useState(null); // Timer to detect double click
    const location = useLocation();
    const navigate = useNavigate();

    // Refs for the user image button and popup
    const userImageRef = useRef(null);
    const popupRef = useRef(null);

    const handleNav = () => {
        setNav(!nav);
    };

    const handleLogout = () => {
        onLogout();
        navigate("/");
        setNav(false);
    };

    const toggleUserNamePopup = () => {
        setIsPopupVisible(!isPopupVisible);
    };

    // Renders a link with Tailwind breakpoints for icon & text sizes
    const renderLink = (to, Icon, label, show) => {
        if (!show) return null;
        return (
            <Link
                to={to}
                onClick={() => {
                    // When a link is clicked in mobile menu, close the menu
                    setNav(false);
                }}
                className={`w-[70%] flex justify-center items-center 
                rounded-full shadow-lg bg-primary_buttons 
                m-2 p-2 cursor-pointer
                hover:scale-110 ease-in-out duration-200
                ${location.pathname === to ? "ring-4 ring-purple-700" : ""}`}
            >
                {/* Icon with responsive text sizes */}
                <Icon className="text-yellow-200 text-2xl md:text-3xl" />
                {/* Label (if provided) with responsive text sizes */}
                {label && (
                    <span className="pl-4 font-semibold text-yellow-100 text-xl md:text-2xl">
                        {label}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <div>
            {/* Mobile Menu Toggle (hamburger) */}
            <AiOutlineMenu
                onClick={handleNav}
                className="size-[3vh] absolute text-white top-4 right-4 bg z-[99] md:hidden cursor-pointer bg-primary_buttons p-2 rounded-full hover:ring-purple-800 ease-in-out duration-200 ring-4 ring-purple-700"
                alt="Toggle menu"
            />

            {/* Mobile Menu (visible when `nav` is true) */}
            {nav && (
                <div
                    className="fixed w-full h-screen bg-mobile_menu_background flex flex-col justify-start items-center z-20 py-20"
                >
                    {renderLink("/", AiOutlineHome, "Home", true)}
                    {renderLink("/about", AiOutlineQuestionCircle, "About", true)}

                    {/* Updated to show the "Chat" link unconditionally */}
                    {renderLink("/chat", AiOutlineMessage, "Chat", true)}

                    {renderLink("/auth", AiOutlineLogin, "Login", !user)}

                    {/* If user is logged in, show user avatar & double-click logout */}
                    {user && (
                        <div className="w-[75%] flex flex-col items-center mt-4">
                            <button
                                ref={userImageRef}
                                onDoubleClick={handleLogout}
                                className="rounded-full bg-none text-white ml-4 cursor-pointer hover:scale-110 ease-in-out duration-200 w-16 h-16 flex justify-center items-center"
                            >
                                <img
                                    src={
                                        user.picture ||
                                        "/assets/images/default-avatar-icon-of-social-media-user-vector.jpg"
                                    }
                                    className="w-full h-full object-cover rounded-full"
                                    alt="User Avatar"
                                />
                            </button>

                            {/* Example popup for username (if you want it on single-click) */}
                            {isPopupVisible && (
                                <div
                                    ref={popupRef}
                                    className="absolute bg-transparent text-white text-center py-2 rounded-md mt-[4rem] z-30"
                                >
                                    <p className="font-semibold text-center">{user.name}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Desktop Menu (hidden on mobile) */}
            <div className="md:block hidden fixed top-2 z-50 right-4">
                <div className="flex flex-row justify-center items-center space-x-4">
                    {/* Home Link */}
                    <div className="relative group">
                        {renderLink("/", AiOutlineHome, null, true)}
                        <div
                            className="absolute top-full mb-2 left-1/2 transform -translate-x-1/2
                opacity-0 group-hover:opacity-100 transition-opacity
                duration-300 ease-in-out bg-yellow-600 text-white text-sm p-2 rounded"
                        >
                            Home
                        </div>
                    </div>

                    {/* About Link */}
                    <div className="relative group">
                        {renderLink("/about", AiOutlineQuestionCircle, null, true)}
                        <div
                            className="absolute top-full mb-2 left-1/2 transform -translate-x-1/2
                opacity-0 group-hover:opacity-100 transition-opacity
                duration-300 ease-in-out bg-yellow-600 text-white text-sm p-2 rounded"
                        >
                            About
                        </div>
                    </div>

                    {/* Chat Link */}
                    <div className="relative group">
                        {renderLink("/chat", AiOutlineMessage, null, true)}
                        <div
                            className="absolute top-full mb-2 left-1/2 transform -translate-x-1/2
                opacity-0 group-hover:opacity-100 transition-opacity
                duration-300 ease-in-out bg-yellow-600 text-white text-sm p-2 rounded"
                        >
                            Chat
                        </div>
                    </div>

                    {/* Auth Link */}
                    {!user && (
                        <div className="relative group">
                            {renderLink("/auth", AiOutlineLogin, null, true)}
                            <div
                                className="absolute top-full mb-2 left-1/2 transform -translate-x-1/2
                opacity-0 group-hover:opacity-100 transition-opacity
                duration-300 ease-in-out bg-yellow-600 text-white text-sm p-2 rounded"
                            >
                                Login
                            </div>
                        </div>
                    )}

                    {/* User Profile Section */}
                    {user && (
                        <div className="flex flex-col justify-center items-center space-x-4">
                            <button
                                ref={userImageRef}
                                onDoubleClick={handleLogout}
                                className="relative rounded-full bg-none text-white ml-4 cursor-pointer
                    hover:scale-110 ease-in-out duration-200 w-16 h-16 flex
                    justify-center items-center group"
                            >
                                <img
                                    src={
                                        user.picture ||
                                        "/assets/images/default-avatar-icon-of-social-media-user-vector.jpg"
                                    }
                                    className="w-full h-full object-cover rounded-full"
                                    alt="User Avatar"
                                />
                                <div
                                    className="flex absolute top-full mt-2 left-1/2 transform
                    -translate-x-1/2 opacity-0 group-hover:opacity-100
                    transition-opacity duration-300 ease-in-out
                    bg-yellow-600 text-white text-xs p-2 rounded whitespace-nowrap"
                                >
                                    {user.name}
                                </div>
                            </button>

                            {isPopupVisible && (
                                <div
                                    ref={popupRef}
                                    className="absolute bg-transparent text-white text-center py-2 rounded-md mt-[4rem] z-30"
                                >
                                    <p className="font-semibold text-center">{user.name}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Navbar;
