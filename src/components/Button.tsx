import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, loading, className = "", ...props }) => {
  return (
    <button
      {...props}
      className={`w-full h-10 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition disabled:opacity-50 ${className}`}
      disabled={loading || props.disabled}
    >
      {loading ? "Loading..." : children}
    </button>
  );
};
