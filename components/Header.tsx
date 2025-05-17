import React from 'react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30">
      <Link to="/" className="text-lg font-bold text-gray-900">
        Web3 Marketplace
      </Link>
    </header>
  );
}; 