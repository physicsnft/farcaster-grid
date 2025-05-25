import React from "react";

export const AnimatedBorder: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="p-[2px] bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-xl">
      <div className="bg-white rounded-lg p-0">
        {children}
      </div>
    </div>
  );
};
