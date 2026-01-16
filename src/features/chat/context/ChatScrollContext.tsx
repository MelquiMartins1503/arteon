"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

interface ChatScrollContextValue {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  showScrollButton: boolean;
  scrollToBottom: () => void;
  handleScroll: () => void;
}

const ChatScrollContext = createContext<ChatScrollContextValue | undefined>(
  undefined,
);

interface ChatScrollProviderProps {
  children: React.ReactNode;
  messagesCount: number;
}

export const ChatScrollProvider = ({
  children,
  messagesCount,
}: ChatScrollProviderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Check if user is at the bottom of the scroll
  const checkIfAtBottom = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      setShowScrollButton(!isAtBottom);
    }
  };

  // Handle scroll events
  const handleScroll = () => {
    setIsUserScrolling(true);
    checkIfAtBottom();
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
      setIsUserScrolling(false);
      setShowScrollButton(false);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current && !isUserScrolling && messagesCount > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesCount, isUserScrolling]);

  // Reset user scrolling flag after new messages arrive
  useEffect(() => {
    if (messagesCount > 0) {
      const timer = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [messagesCount]);

  return (
    <ChatScrollContext.Provider
      value={{
        scrollRef,
        showScrollButton,
        scrollToBottom,
        handleScroll,
      }}
    >
      {children}
    </ChatScrollContext.Provider>
  );
};

export const useChatScrollContext = () => {
  const context = useContext(ChatScrollContext);
  if (context === undefined) {
    throw new Error(
      "useChatScrollContext must be used within a ChatScrollProvider",
    );
  }
  return context;
};
