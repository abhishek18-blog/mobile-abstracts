import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './api';

let socket: Socket | null = null;

/**
 * Connects (or reuses) an authenticated Socket.IO connection to the backend server.
 */
export async function getSocket(): Promise<Socket | null> {
  const token = await AsyncStorage.getItem('token');
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  const baseUrl = getApiBaseUrl();
  if (!socket) {
    socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  } else {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
