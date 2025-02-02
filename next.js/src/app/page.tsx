"use client";

import React from "react";
import { ChatProvider } from "../context/ChatContext";
import ChatSidebar from "../components/ChatSidebar";
import ChatHistory from "../components/ChatHistory";
import ChatInput from "../components/ChatInput";

export default function Home() {
  return (
    <ChatProvider>
      <div className="min-h-screen flex flex-col md:flex-row">
        <ChatSidebar />
        <main className="flex flex-col flex-1 p-4 max-w-3xl mx-auto">
          <ChatHistory />
          <ChatInput />
        </main>
      </div>
    </ChatProvider>
  );
}
