"use client";

import React, { useState } from "react";
import { ChatProvider } from "../context/ChatContext";
import ChatSidebar from "../components/ChatSidebar";
import AgentChats from "../components/AgentChats";
import ChatInput from "../components/ChatInput";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ChatProvider>
      <div className="min-h-screen max-h-screen flex flex-col md:flex-row relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <ChatSidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="absolute top-0 left-0 w-64 h-full bg-white shadow-md z-20 md:hidden">
            <div className="flex justify-end p-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-2xl"
              >
                &times;
              </button>
            </div>
            <ChatSidebar />
          </div>
        )}

        <main className="flex flex-col flex-1 overflow-hidden">
          {/* Mobile Header with Burger Menu */}
          <div className="flex items-center p-2 bg-gray-100 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-2xl mr-2"
            >
              &#9776;
            </button>
            <span className="font-bold">Chat</span>
          </div>
          <AgentChats />
          <ChatInput />
        </main>
      </div>
    </ChatProvider>
  );
}
