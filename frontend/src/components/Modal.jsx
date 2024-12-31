// Modal.jsx
import React from 'react';

const Modal = ({ message, onClose, onLogin }) => {
    return (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
                <h2 className="text-xl font-semibold mb-4">{message}</h2>
                <div className="flex justify-between">
                    <button
                        className="bg-gray-500 text-white px-4 py-2 rounded-md"
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded-md"
                        onClick={onLogin}
                    >
                        Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
