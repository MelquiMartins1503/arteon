import { useEffect, useRef, useState } from "react";

interface useChatScrollProps {
  messagesCount: number;
}

export const useChatScroll = ({ messagesCount }: useChatScrollProps) => {
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

  return {
    scrollRef,
    showScrollButton,
    handleScroll,
    scrollToBottom,
  };
};
