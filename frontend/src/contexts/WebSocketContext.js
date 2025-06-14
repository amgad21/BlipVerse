import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

// this is where we handle real-time updates
const WebSocketContext = createContext(null);

// hook to get websocket stuff anywhere
export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  // keep track of the websocket connection
  const ws = useRef(null);
  const [messages, setMessages] = useState([]);
  const { isAuthenticated } = useAuth();

  // set up websocket when component loads
  useEffect(() => {
    if (isAuthenticated) {
      // connect to our websocket server
      ws.current = new WebSocket('ws://localhost:5001');

      // handle connection open
      ws.current.onopen = () => {
        console.log('Connected to websocket');
      };

      // handle any errors
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      // handle connection close
      ws.current.onclose = () => {
        console.log('Disconnected from websocket');
      };

      // clean up when component unmounts
      return () => {
        if (ws.current) {
          ws.current.close();
        }
      };
    }
  }, [isAuthenticated]);

  // send a message to the server
  const sendMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  // stuff we want to share with other components
  const value = {
    ws: ws.current,
    messages,
    sendMessage
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}; 