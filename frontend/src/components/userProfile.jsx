import React from 'react';

const UserProfile = ({ user, onLogout }) => {
    return (
        <div className="flex items-center space-x-4 bg-white shadow-lg rounded-lg p-4">
            <img
                src={user.picture || "/assets/images/avatar-default-svgrepo-com.svg"}
                alt="User Profile"
                className="w-12 h-12 rounded-full border-2 border-gray-300"
            />
            <div>
                <h3 className="font-bold text-lg">{user.name}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <button
                onClick={onLogout}
                className="bg-none text-white px-4 py-2 rounded-md"
            >
                Logout
            </button>
        </div>
    );
};

export default UserProfile;
